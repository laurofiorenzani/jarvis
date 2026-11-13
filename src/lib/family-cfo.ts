import { z } from 'zod'

// Synthetic-first Family CFO domain contract. This module performs validation only;
// it does not connect to banks, persist records, or move money.

export const CfoCurrencySchema = z.string().regex(/^[A-Z]{3}$/)
export const CfoDecimalAmountSchema = z.string().regex(/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/, 'Use a decimal string with at most two fractional digits')

export const CfoConfidenceSchema = z.enum(['verified', 'user_confirmed', 'estimated', 'unknown'])
export const CfoRecordStatusSchema = z.enum(['pending_review', 'confirmed', 'rejected', 'superseded'])
export const CfoSourceTypeSchema = z.enum(['manual', 'bank_export', 'provider_api', 'document', 'calculation'])

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const IsoDateTimeSchema = z.string().datetime({ offset: true })

export const CfoProvenanceSchema = z.object({
  sourceType: CfoSourceTypeSchema,
  sourceName: z.string().trim().min(1).max(120),
  sourceRecordId: z.string().trim().max(200).nullable().default(null),
  observedAt: IsoDateTimeSchema,
  importedAt: IsoDateTimeSchema,
  effectiveAt: IsoDateSchema,
}).strict()

export const CfoMoneySchema = z.object({
  amount: CfoDecimalAmountSchema,
  currency: CfoCurrencySchema,
}).strict()

export const CfoTransactionSchema = z.object({
  id: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  accountId: z.string().uuid(),
  postedAt: IsoDateSchema.nullable(),
  transactionAt: IsoDateSchema,
  description: z.string().trim().min(1).max(500),
  merchant: z.string().trim().max(200).nullable().default(null),
  money: CfoMoneySchema,
  status: z.enum(['pending', 'posted', 'reversed']),
  confidence: CfoConfidenceSchema,
  recordStatus: CfoRecordStatusSchema,
  provenance: CfoProvenanceSchema,
}).strict()

export const CfoBalanceSnapshotSchema = z.object({
  id: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  accountId: z.string().uuid(),
  observedAt: IsoDateTimeSchema,
  money: CfoMoneySchema,
  confidence: CfoConfidenceSchema,
  provenance: CfoProvenanceSchema,
}).strict()

// Convert an exact decimal string into integer minor units. BigInt avoids
// floating-point rounding errors; no implicit currency conversion is performed.
export function decimalToMinorUnits(value: string): bigint {
  if (!CfoDecimalAmountSchema.safeParse(value).success) {
    throw new TypeError('Invalid decimal amount')
  }
  const negative = value.startsWith('-')
  const unsigned = negative ? value.slice(1) : value
  const [whole, fraction = ''] = unsigned.split('.')
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
  return negative ? -minor : minor
}

export function minorUnitsToDecimal(value: bigint): string {
  const negative = value < 0n
  const absolute = negative ? -value : value
  const whole = absolute / 100n
  const fraction = (absolute % 100n).toString().padStart(2, '0')
  return `${negative ? '-' : ''}${whole}.${fraction}`
}

export function sumMoney(values: readonly z.infer<typeof CfoMoneySchema>[]): z.infer<typeof CfoMoneySchema> {
  if (values.length === 0) return { amount: '0.00', currency: 'EUR' }
  const currency = values[0].currency
  if (values.some((value) => value.currency !== currency)) {
    throw new TypeError('Cannot sum amounts in different currencies without an explicit FX conversion')
  }
  const total = values.reduce((sum, value) => sum + decimalToMinorUnits(value.amount), 0n)
  return { amount: minorUnitsToDecimal(total), currency }
}


export type CfoTransaction = z.infer<typeof CfoTransactionSchema>

/**
 * Pair only high-confidence internal transfers. Matching is deliberately
 * conservative: exact opposite amount/currency, same owner, different accounts,
 * posted + confirmed records, within three calendar days, and unique on both sides.
 * Ambiguous candidates remain ordinary transactions for manual review.
 */
export function matchInternalTransfers(
  transactions: readonly CfoTransaction[],
): Array<{ debitId: string; creditId: string }> {
  const eligible = transactions.filter((tx) =>
    tx.status === 'posted' && tx.recordStatus === 'confirmed' &&
    tx.postedAt !== null,
  )
  const candidates = new Map<string, Set<string>>()
  for (let i = 0; i < eligible.length; i += 1) {
    const left = eligible[i]
    const leftAmount = decimalToMinorUnits(left.money.amount)
    if (leftAmount === 0n) continue
    for (let j = i + 1; j < eligible.length; j += 1) {
      const right = eligible[j]
      if (left.ownerUserId !== right.ownerUserId ||
          left.accountId === right.accountId ||
          left.money.currency !== right.money.currency ||
          leftAmount + decimalToMinorUnits(right.money.amount) !== 0n) continue
      const days = Math.abs(Date.parse(`${left.postedAt}T00:00:00Z`) - Date.parse(`${right.postedAt}T00:00:00Z`)) / 86_400_000
      if (days > 3) continue
      const debit = leftAmount < 0n ? left : right
      const credit = leftAmount < 0n ? right : left
      const key = `${debit.id}:${credit.id}`
      candidates.set(debit.id, new Set([...(candidates.get(debit.id) ?? []), key]))
      candidates.set(credit.id, new Set([...(candidates.get(credit.id) ?? []), key]))
    }
  }
  const allPairs = [...new Set([...candidates.values()].flatMap((set) => [...set]))]
  return allPairs
    .map((key) => {
      const [debitId, creditId] = key.split(':')
      return { debitId, creditId }
    })
    .filter(({ debitId, creditId }) =>
      candidates.get(debitId)?.size === 1 && candidates.get(creditId)?.size === 1,
    )
}

/** Stable conservative duplicate key; retain original records and review collisions. */
export function transactionFingerprint(tx: CfoTransaction): string {
  const normalizedDescription = tx.description.normalize('NFKC').trim().toLocaleLowerCase('en')
    .replace(/\s+/g, ' ')
  return [
    tx.ownerUserId,
    tx.accountId,
    tx.transactionAt,
    tx.money.currency,
    tx.money.amount,
    normalizedDescription,
  ].join('|')
}

/** Confirmed posted cash flow, excluding only uniquely matched internal transfers. */
export function calculateCashFlow(
  transactions: readonly CfoTransaction[],
  period: { start: string; end: string },
): { currency: string; inflows: string; outflows: string; net: string; includedCount: number; excludedTransferCount: number } {
  if (!IsoDateSchema.safeParse(period.start).success ||
      !IsoDateSchema.safeParse(period.end).success ||
      period.start > period.end) {
    throw new TypeError('Invalid cash-flow period')
  }
  const transfers = matchInternalTransfers(transactions)
  const transferIds = new Set(transfers.flatMap((pair) => [pair.debitId, pair.creditId]))
  const eligible = transactions.filter((tx) =>
    tx.status === 'posted' && tx.recordStatus === 'confirmed' &&
    tx.postedAt !== null && tx.postedAt >= period.start && tx.postedAt <= period.end &&
    !transferIds.has(tx.id),
  )
  const currencies = new Set(eligible.map((tx) => tx.money.currency))
  if (currencies.size > 1) throw new TypeError('Cash flow requires a single currency; calculate currencies separately')
  const currency = eligible[0]?.money.currency ?? transactions[0]?.money.currency ?? 'EUR'
  const inflows = eligible.filter((tx) => decimalToMinorUnits(tx.money.amount) > 0n)
  const outflows = eligible.filter((tx) => decimalToMinorUnits(tx.money.amount) < 0n)
  const sum = (items: readonly CfoTransaction[]) => items.reduce(
    (total, tx) => total + decimalToMinorUnits(tx.money.amount), 0n,
  )
  const inTotal = sum(inflows)
  const outTotal = -sum(outflows)
  return {
    currency,
    inflows: minorUnitsToDecimal(inTotal),
    outflows: minorUnitsToDecimal(outTotal),
    net: minorUnitsToDecimal(inTotal - outTotal),
    includedCount: eligible.length,
    excludedTransferCount: transfers.reduce((count, pair) => count + transactions.filter((tx) =>
      (tx.id === pair.debitId || tx.id === pair.creditId) &&
      tx.postedAt !== null && tx.postedAt >= period.start && tx.postedAt <= period.end,
    ).length, 0),
  }
}
