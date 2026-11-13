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
