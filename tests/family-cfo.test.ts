import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CfoBalanceSnapshotSchema,
  CfoTransactionSchema,
  amountMatchesMinorUnit,
  decimalToScaledUnits,
  scaledUnitsToDecimal,
  sumMoney,
} from '../src/lib/family-cfo.ts'

const provenance = {
  sourceType: 'manual',
  sourceName: 'synthetic-test-fixture',
  sourceRecordId: null,
  observedAt: '2026-11-13T12:00:00Z',
  importedAt: '2026-11-13T12:00:00Z',
  effectiveAt: '2026-11-13',
}
const validTransaction = {
  id: '10000000-0000-4000-8000-000000000001',
  ownerUserId: '20000000-0000-4000-8000-000000000001',
  accountId: '30000000-0000-4000-8000-000000000001',
  postedAt: '2026-11-13',
  transactionAt: '2026-11-13',
  description: 'Synthetic grocery transaction',
  merchant: 'Example Market',
  money: { amount: '-12.34', currency: 'EUR' },
  status: 'posted',
  confidence: 'user_confirmed',
  recordStatus: 'confirmed',
  provenance,
}

test('accepts real leap days and rejects impossible calendar dates', () => {
  assert.equal(CfoTransactionSchema.safeParse({ ...validTransaction, transactionAt: '2024-02-29' }).success, true)
  assert.equal(CfoTransactionSchema.safeParse({ ...validTransaction, transactionAt: '2025-02-29' }).success, false)
  assert.equal(CfoTransactionSchema.safeParse({ ...validTransaction, postedAt: '2026-02-30' }).success, false)
  assert.equal(CfoTransactionSchema.safeParse({ ...validTransaction, provenance: { ...provenance, effectiveAt: '2026-13-01' } }).success, false)
})

test('validates a synthetic transaction with source provenance', () => {
  assert.equal(CfoTransactionSchema.safeParse(validTransaction).success, true)
  assert.equal(CfoTransactionSchema.safeParse({ ...validTransaction, amount: 12.34 }).success, false)
  assert.equal(CfoTransactionSchema.safeParse({ ...validTransaction, ownerUserId: 'not-a-uuid' }).success, false)
  assert.equal(CfoTransactionSchema.safeParse({ ...validTransaction, provenance: { ...provenance, sourceName: '' } }).success, false)
})

test('validates dated balance snapshots and rejects missing provenance', () => {
  const snapshot = {
    id: '40000000-0000-4000-8000-000000000001',
    ownerUserId: validTransaction.ownerUserId,
    accountId: validTransaction.accountId,
    observedAt: '2026-11-13T12:00:00Z',
    money: { amount: '1234.56', currency: 'EUR' },
    confidence: 'verified',
    provenance,
  }
  assert.equal(CfoBalanceSnapshotSchema.safeParse(snapshot).success, true)
  assert.equal(CfoBalanceSnapshotSchema.safeParse({ ...snapshot, provenance: undefined }).success, false)
})

test('uses exact four-place integer scaling without assuming a currency exponent', () => {
  assert.equal(decimalToScaledUnits('0.10') + decimalToScaledUnits('0.20'), 3000n)
  assert.equal(scaledUnitsToDecimal(decimalToScaledUnits('-12.34')), '-12.34')
  assert.equal(scaledUnitsToDecimal(999999999999999999n), '99999999999999.9999')
  assert.equal(scaledUnitsToDecimal(decimalToScaledUnits('1.234')), '1.234')
  assert.throws(() => decimalToScaledUnits('1.00001'), /Invalid decimal/)
  assert.throws(() => decimalToScaledUnits('1e3'), /Invalid decimal/)
})

test('validates amounts against currency exponents without rounding', () => {
  assert.equal(amountMatchesMinorUnit('1200', 0), true)
  assert.equal(amountMatchesMinorUnit('1200.01', 0), false)
  assert.equal(amountMatchesMinorUnit('1.23', 2), true)
  assert.equal(amountMatchesMinorUnit('1.2300', 2), true)
  assert.equal(amountMatchesMinorUnit('1.234', 2), false)
  assert.equal(amountMatchesMinorUnit('1.234', 3), true)
  assert.equal(amountMatchesMinorUnit('1.2345', 3), false)
  assert.equal(amountMatchesMinorUnit('1.0000', 0), true)
  assert.equal(amountMatchesMinorUnit('1.0001', 0), false)
  assert.equal(amountMatchesMinorUnit('1.00', 5), false)
})

test('sums only matching currencies and never performs implicit FX', () => {
  assert.deepEqual(sumMoney([
    { amount: '10.10', currency: 'EUR' },
    { amount: '-2.35', currency: 'EUR' },
    { amount: '0.25', currency: 'EUR' },
  ]), { amount: '8', currency: 'EUR' })
  assert.deepEqual(sumMoney([
    { amount: '1200', currency: 'JPY' },
    { amount: '-200', currency: 'JPY' },
  ]), { amount: '1000', currency: 'JPY' })
  assert.deepEqual(sumMoney([
    { amount: '1.234', currency: 'KWD' },
    { amount: '-0.234', currency: 'KWD' },
  ]), { amount: '1', currency: 'KWD' })
  assert.throws(() => sumMoney([
    { amount: '10.00', currency: 'EUR' },
    { amount: '10.00', currency: 'USD' },
  ]), /different currencies/)
  assert.deepEqual(sumMoney([], 'JPY'), { amount: '0', currency: 'JPY' })
  assert.throws(() => sumMoney([]), /explicit currency/)
})


test('pairs only unique, confirmed internal transfers', async () => {
  const { matchInternalTransfers } = await import('../src/lib/family-cfo.ts')
  const debit = { ...validTransaction, id: '10000000-0000-4000-8000-000000000011', accountId: '30000000-0000-4000-8000-000000000011', money: { amount: '-50.00', currency: 'EUR' } }
  const credit = { ...validTransaction, id: '10000000-0000-4000-8000-000000000012', accountId: '30000000-0000-4000-8000-000000000012', money: { amount: '50.00', currency: 'EUR' }, postedAt: '2026-11-14', transactionAt: '2026-11-14' }
  assert.deepEqual(matchInternalTransfers([debit, credit]), [{ debitId: debit.id, creditId: credit.id }])
  assert.deepEqual(matchInternalTransfers([debit, { ...credit, recordStatus: 'pending_review' }]), [])
  assert.deepEqual(matchInternalTransfers([debit, { ...credit, money: { amount: '49.99', currency: 'EUR' } }]), [])
})

test('cash flow requires an explicit currency when the period has no eligible records', async () => {
  const { calculateCashFlow } = await import('../src/lib/family-cfo.ts')
  const period = { start: '2026-11-01', end: '2026-11-30' }
  assert.throws(() => calculateCashFlow([], period), /explicit currency/)
  assert.deepEqual(calculateCashFlow([], { ...period, currency: 'JPY' }), {
    currency: 'JPY', inflows: '0', outflows: '0', net: '0',
    includedCount: 0, excludedTransferCount: 0,
  })
})

test('cash flow excludes matched transfers and includes confirmed posted records only', async () => {
  const { calculateCashFlow } = await import('../src/lib/family-cfo.ts')
  const debit = { ...validTransaction, id: '10000000-0000-4000-8000-000000000021', accountId: '30000000-0000-4000-8000-000000000021', money: { amount: '-50.00', currency: 'EUR' } }
  const credit = { ...validTransaction, id: '10000000-0000-4000-8000-000000000022', accountId: '30000000-0000-4000-8000-000000000022', money: { amount: '50.00', currency: 'EUR' } }
  const salary = { ...validTransaction, id: '10000000-0000-4000-8000-000000000023', money: { amount: '2000.00', currency: 'EUR' } }
  const grocery = { ...validTransaction, id: '10000000-0000-4000-8000-000000000024', money: { amount: '-120.50', currency: 'EUR' } }
  const pending = { ...validTransaction, id: '10000000-0000-4000-8000-000000000025', status: 'pending' as const, money: { amount: '-999.00', currency: 'EUR' } }
  assert.deepEqual(calculateCashFlow([debit, credit, salary, grocery, pending], { start: '2026-11-01', end: '2026-11-30' }), {
    currency: 'EUR', inflows: '2000', outflows: '120.5', net: '1879.5',
    includedCount: 2, excludedTransferCount: 2,
  })
  const periodEndDebit = { ...debit, postedAt: '2026-11-30', transactionAt: '2026-11-30' }
  const outsidePeriodCredit = { ...credit, postedAt: '2026-12-01', transactionAt: '2026-12-01' }
  const oneLegInPeriod = calculateCashFlow([periodEndDebit, outsidePeriodCredit, salary], { start: '2026-11-01', end: '2026-11-30' })
  assert.equal(oneLegInPeriod.includedCount, 1)
  assert.equal(oneLegInPeriod.excludedTransferCount, 1)
  const onlyCreditInPeriod = calculateCashFlow([
    { ...debit, postedAt: '2026-12-01', transactionAt: '2026-12-01' },
    { ...credit, postedAt: '2026-11-30', transactionAt: '2026-11-30' },
  ], { start: '2026-11-01', end: '2026-11-30' })
  assert.equal(onlyCreditInPeriod.excludedTransferCount, 1)
})

test('transaction fingerprint is stable across description whitespace and case', async () => {
  const { transactionFingerprint } = await import('../src/lib/family-cfo.ts')
  assert.equal(
    transactionFingerprint(validTransaction),
    transactionFingerprint({ ...validTransaction, description: '  SYNTHETIC   GROCERY TRANSACTION ' }),
  )
})
