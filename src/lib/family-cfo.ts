import { z } from 'zod'

// Synthetic-first Family CFO domain contract. This module performs validation only;
// it does not connect to banks, persist records, or move money.

export const CfoCurrencySchema = z.string().regex(/^[A-Z]{3}$/)
export const CfoDecimalAmountSchema = z.string().regex(/^-?(?:0|[1-9]\d*)(?:\.\d{1,4})?$/, 'Use an exact decimal string with at most four fractional digits')

export const CfoConfidenceSchema = z.enum(['verified', 'user_confirmed', 'estimated', 'unknown'])
export const CfoRecordStatusSchema = z.enum(['pending_review', 'confirmed', 'rejected', 'superseded'])
export const CfoSourceTypeSchema = z.enum(['manual', 'bank_export', 'provider_api', 'document', 'calculation'])

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}, 'Use a real calendar date in YYYY-MM-DD format')
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
  currencyRegistryVersion: z.string().trim().min(1).max(80),
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
  currencyRegistryVersion: z.string().trim().min(1).max(80),
  confidence: CfoConfidenceSchema,
  provenance: CfoProvenanceSchema,
}).strict()

// Internal arithmetic uses a fixed four-decimal scale, the maximum ISO 4217
// minor-unit exponent. This is NOT a currency's minor unit: the pinned currency
// registry remains authoritative for validating each amount's actual exponent.
// BigInt avoids floating-point rounding; no implicit FX conversion is performed.
const CFO_DECIMAL_SCALE = 4
const CFO_DECIMAL_FACTOR = 10n ** BigInt(CFO_DECIMAL_SCALE)

export function decimalToScaledUnits(value: string): bigint {
  if (!CfoDecimalAmountSchema.safeParse(value).success) {
    throw new TypeError('Invalid decimal amount')
  }
  const negative = value.startsWith('-')
  const unsigned = negative ? value.slice(1) : value
  const [whole, fraction = ''] = unsigned.split('.')
  const scaled = BigInt(whole) * CFO_DECIMAL_FACTOR +
    BigInt(fraction.padEnd(CFO_DECIMAL_SCALE, '0'))
  return negative ? -scaled : scaled
}

export function scaledUnitsToDecimal(value: bigint): string {
  const negative = value < 0n
  const absolute = negative ? -value : value
  const whole = absolute / CFO_DECIMAL_FACTOR
  const fraction = (absolute % CFO_DECIMAL_FACTOR).toString()
    .padStart(CFO_DECIMAL_SCALE, '0').replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}

// Validate the exact numeric value against the trusted registry exponent.
// Extra fractional zeroes are harmless; any non-zero digit beyond the exponent
// is rejected, matching PostgreSQL's amount = trunc(amount, minor_unit) rule.
export function amountMatchesMinorUnit(value: string, minorUnit: number): boolean {
  if (!CfoDecimalAmountSchema.safeParse(value).success ||
      !Number.isInteger(minorUnit) || minorUnit < 0 || minorUnit > CFO_DECIMAL_SCALE) return false
  const fraction = (value.startsWith('-') ? value.slice(1) : value).split('.')[1] ?? ''
  return [...fraction.slice(minorUnit)].every((digit) => digit === '0')
}

export type CfoCurrencyRegistryEntry = {
  currencyCode: string
  registryVersion: string
  minorUnit: number
  effectiveFrom: string
  effectiveTo?: string | null
}

/**
 * Validate a money value against one unambiguous, effective-dated registry row.
 * Unknown versions, overlapping rows, malformed metadata and unsupported codes fail closed.
 */
export function validateCfoMoneyAgainstRegistry(
  money: unknown,
  effectiveAt: unknown,
  registryVersion: unknown,
  registry: readonly CfoCurrencyRegistryEntry[],
): boolean {
  const parsed = CfoMoneySchema.safeParse(money)
  if (!parsed.success || !IsoDateSchema.safeParse(effectiveAt).success ||
      typeof registryVersion !== 'string' || !registryVersion.trim() || registryVersion.length > 80 ||
      !Array.isArray(registry)) return false

  const effectiveDate = effectiveAt as string
  const relevant = registry.filter((entry) =>
    entry.currencyCode === parsed.data.currency && entry.registryVersion === registryVersion,
  )
  if (relevant.length === 0 || relevant.some((entry) =>
    !/^[A-Z]{3}$/.test(entry.currencyCode) ||
    !entry.registryVersion.trim() || entry.registryVersion.length > 80 ||
    !Number.isInteger(entry.minorUnit) || entry.minorUnit < 0 || entry.minorUnit > CFO_DECIMAL_SCALE ||
    !IsoDateSchema.safeParse(entry.effectiveFrom).success ||
    (entry.effectiveTo != null &&
      (!IsoDateSchema.safeParse(entry.effectiveTo).success || entry.effectiveTo <= entry.effectiveFrom))
  )) return false

  const matching = relevant.filter((entry) =>
    effectiveDate >= entry.effectiveFrom &&
    (entry.effectiveTo == null || effectiveDate < entry.effectiveTo),
  )
  return matching.length === 1 && amountMatchesMinorUnit(parsed.data.amount, matching[0].minorUnit)
}

export function validateCfoTransactionCurrency(
  input: unknown,
  registry: readonly CfoCurrencyRegistryEntry[],
): boolean {
  const parsed = CfoTransactionSchema.safeParse(input)
  return parsed.success && validateCfoMoneyAgainstRegistry(
    parsed.data.money, parsed.data.provenance.effectiveAt, parsed.data.currencyRegistryVersion, registry,
  )
}

export function validateCfoBalanceSnapshotCurrency(
  input: unknown,
  registry: readonly CfoCurrencyRegistryEntry[],
): boolean {
  const parsed = CfoBalanceSnapshotSchema.safeParse(input)
  return parsed.success && validateCfoMoneyAgainstRegistry(
    parsed.data.money, parsed.data.provenance.effectiveAt, parsed.data.currencyRegistryVersion, registry,
  )
}

export function sumMoney(
  values: readonly z.infer<typeof CfoMoneySchema>[],
  emptyCurrency?: string,
): z.infer<typeof CfoMoneySchema> {
  if (values.length === 0) {
    if (!emptyCurrency || !CfoCurrencySchema.safeParse(emptyCurrency).success) {
      throw new TypeError('An explicit currency is required to sum an empty list')
    }
    return { amount: '0', currency: emptyCurrency }
  }
  const currency = values[0].currency
  if (values.some((value) => value.currency !== currency)) {
    throw new TypeError('Cannot sum amounts in different currencies without an explicit FX conversion')
  }
  const total = values.reduce((sum, value) => sum + decimalToScaledUnits(value.amount), 0n)
  return { amount: scaledUnitsToDecimal(total), currency }
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
    const leftAmount = decimalToScaledUnits(left.money.amount)
    if (leftAmount === 0n) continue
    for (let j = i + 1; j < eligible.length; j += 1) {
      const right = eligible[j]
      if (left.ownerUserId !== right.ownerUserId ||
          left.accountId === right.accountId ||
          left.money.currency !== right.money.currency ||
          leftAmount + decimalToScaledUnits(right.money.amount) !== 0n) continue
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
  period: { start: string; end: string; currency?: string },
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
  const currency = eligible[0]?.money.currency ?? period.currency
  if (!currency || !CfoCurrencySchema.safeParse(currency).success) {
    throw new TypeError('An explicit currency is required when the period has no eligible transactions')
  }
  if (period.currency && period.currency !== currency) {
    throw new TypeError('Requested cash-flow currency does not match the eligible records')
  }
  if (eligible.some((tx) => tx.money.currency !== currency)) {
    throw new TypeError('Cash flow requires a single currency; calculate currencies separately')
  }
  const inflows = eligible.filter((tx) => decimalToScaledUnits(tx.money.amount) > 0n)
  const outflows = eligible.filter((tx) => decimalToScaledUnits(tx.money.amount) < 0n)
  const sum = (items: readonly CfoTransaction[]) => items.reduce(
    (total, tx) => total + decimalToScaledUnits(tx.money.amount), 0n,
  )
  const inTotal = sum(inflows)
  const outTotal = -sum(outflows)
  return {
    currency,
    inflows: scaledUnitsToDecimal(inTotal),
    outflows: scaledUnitsToDecimal(outTotal),
    net: scaledUnitsToDecimal(inTotal - outTotal),
    includedCount: eligible.length,
    excludedTransferCount: transfers.reduce((count, pair) => count + transactions.filter((tx) =>
      (tx.id === pair.debitId || tx.id === pair.creditId) &&
      tx.postedAt !== null && tx.postedAt >= period.start && tx.postedAt <= period.end,
    ).length, 0),
  }
}
