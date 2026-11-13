import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CfoTransactionSchema, CfoMoneySchema, sumMoney } from '../src/lib/family-cfo.ts'

const provenance = {
  sourceType: 'manual' as const,
  sourceName: 'Synthetic fixture',
  sourceRecordId: null,
  importedAt: null,
  sourceHash: null,
}

const validTransaction = {
  id: '10000000-0000-4000-8000-000000000001',
  ownerUserId: '20000000-0000-4000-8000-000000000001',
  accountId: '30000000-0000-4000-8000-000000000001',
  internalTransferPairId: null,
  postedAt: '2026-11-13',
  transactionAt: '2026-11-13',
  description: 'Synthetic grocery transaction',
  money: { amount: '12.34', currency: 'EUR' as const },
  status: 'posted' as const,
  recordStatus: 'confirmed' as const,
  confidence: 'verified' as const,
  provenance,
}

test('validates a synthetic transaction with source provenance', () => {
  assert.equal(CfoTransactionSchema.safeParse(validTransaction).success, true)
  assert.equal(CfoTransactionSchema.safeParse({ ...validTransaction, amount: 12.34 }).success, false)
  assert.equal(CfoTransactionSchema.safeParse({ ...validTransaction, ownerUserId: 'not-a-uuid' }).success, false)
  assert.equal(CfoTransactionSchema.safeParse({ ...validTransaction, internalTransferPairId: 'not-a-uuid' }).success, false)
  assert.equal(CfoTransactionSchema.safeParse({ ...validTransaction, internalTransferPairId: '50000000-0000-4000-8000-000000000001' }).success, true)
  assert.equal(CfoTransactionSchema.safeParse({ ...validTransaction, provenance: { ...provenance, sourceName: '' } }).success, false)
})

test('validates exact decimal money', () => {
  assert.equal(CfoMoneySchema.safeParse({ amount: '12.34', currency: 'EUR' }).success, true)
  assert.equal(CfoMoneySchema.safeParse({ amount: 12.34, currency: 'EUR' }).success, false)
})

test('sums only matching currencies and never performs implicit FX', () => {
  assert.deepEqual(sumMoney([
    { amount: '10.00', currency: 'EUR' },
    { amount: '-2.50', currency: 'EUR' },
  ]), { amount: '7.50', currency: 'EUR' })
  assert.throws(() => sumMoney([
    { amount: '10.00', currency: 'EUR' },
    { amount: '10.00', currency: 'USD' },
  ]), /different currencies/)
  assert.deepEqual(sumMoney([]), { amount: '0.00', currency: 'EUR' })
})

test('pairs only unique, confirmed internal transfers', async () => {
  const { matchInternalTransfers } = await import('../src/lib/family-cfo.ts')
  const debit = { ...validTransaction, id: '10000000-0000-4000-8000-000000000011', accountId: '30000000-0000-4000-8000-000000000011', internalTransferPairId: '50000000-0000-4000-8000-000000000001', money: { amount: '-50.00', currency: 'EUR' } }
  const credit = { ...validTransaction, id: '10000000-0000-4000-8000-000000000012', accountId: '30000000-0000-4000-8000-000000000012', internalTransferPairId: '50000000-0000-4000-8000-000000000001', money: { amount: '50.00', currency: 'EUR' }, postedAt: '2026-11-14', transactionAt: '2026-11-14' }
  assert.deepEqual(matchInternalTransfers([debit, credit]), [{ debitId: debit.id, creditId: credit.id }])
  assert.deepEqual(matchInternalTransfers([{ ...debit, internalTransferPairId: null }, { ...credit, internalTransferPairId: null }]), [], 'equal and opposite records need explicit pair confirmation')
  assert.deepEqual(matchInternalTransfers([debit, { ...credit, internalTransferPairId: '50000000-0000-4000-8000-000000000002' }]), [], 'different pair identifiers must never match')
  assert.deepEqual(matchInternalTransfers([debit, { ...credit, recordStatus: 'pending_review' }]), [])
  assert.deepEqual(matchInternalTransfers([debit, { ...credit, money: { amount: '49.99', currency: 'EUR' } }]), [])
  assert.deepEqual(matchInternalTransfers([debit, { ...credit, confidence: 'estimated' }]), [], 'estimated credits must not be excluded as transfers')
  assert.deepEqual(matchInternalTransfers([{ ...debit, confidence: 'unknown' }, credit]), [], 'unknown-confidence debits must not be excluded as transfers')
})

test('cash flow excludes matched transfers and includes confirmed posted records only', async () => {
  const { calculateCashFlow } = await import('../src/lib/family-cfo.ts')
  const debit = { ...validTransaction, id: '10000000-0000-4000-8000-000000000021', accountId: '30000000-0000-4000-8000-000000000021', internalTransferPairId: '50000000-0000-4000-8000-000000000021', money: { amount: '-50.00', currency: 'EUR' } }
  const credit = { ...validTransaction, id: '10000000-0000-4000-8000-000000000022', accountId: '30000000-0000-4000-8000-000000000022', internalTransferPairId: '50000000-0000-4000-8000-000000000021', money: { amount: '50.00', currency: 'EUR' } }
  const salary = { ...validTransaction, id: '10000000-0000-4000-8000-000000000023', money: { amount: '2000.00', currency: 'EUR' } }
  const grocery = { ...validTransaction, id: '10000000-0000-4000-8000-000000000024', money: { amount: '-120.50', currency: 'EUR' } }
  const pending = { ...validTransaction, id: '10000000-0000-4000-8000-000000000025', status: 'pending' as const, money: { amount: '-999.00', currency: 'EUR' } }
  const unrelatedDebit = { ...validTransaction, id: '10000000-0000-4000-8000-000000000026', accountId: '30000000-0000-4000-8000-000000000026', description: 'Unrelated utility bill', money: { amount: '-25.00', currency: 'EUR' } }
  const unrelatedCredit = { ...validTransaction, id: '10000000-0000-4000-8000-000000000027', accountId: '30000000-0000-4000-8000-000000000027', description: 'Unrelated refund', money: { amount: '25.00', currency: 'EUR' } }
  assert.deepEqual(calculateCashFlow([debit, credit, salary, grocery, pending, unrelatedDebit, unrelatedCredit], { start: '2026-11-01', end: '2026-11-30' }), {
    currency: 'EUR', inflows: '2025.00', outflows: '145.50', net: '1879.50',
    includedCount: 4, excludedTransferCount: 2,
  })
  const periodEndDebit = { ...debit, postedAt: '2026-11-30', transactionAt: '2026-11-30' }
  const outsidePeriodCredit = { ...credit, postedAt: '2026-12-01', transactionAt: '2026-12-01' }
  const oneLegInPeriod = calculateCashFlow([periodEndDebit, outsidePeriodCredit, salary], { start: '2026-11-01', end: '2026-11-30' })
  assert.equal(oneLegInPeriod.includedCount, 1)
  assert.equal(oneLegInPeriod.excludedTransferCount, 1)
  const onlyCreditInPeriod = calculateCashFlow([
    { ...debit, postedAt: '2026-12-01', transactionAt: '2026-12-01' },
    { ...credit, postedAt: '2026-11-30', transactionAt: '2026-11-30' },
    salary,
  ], { start: '2026-11-01', end: '2026-11-30' })
  assert.equal(onlyCreditInPeriod.includedCount, 2)
  assert.equal(onlyCreditInPeriod.excludedTransferCount, 0)
})
