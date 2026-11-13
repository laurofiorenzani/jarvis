import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CfoBalanceSnapshotSchema,
  CfoTransactionSchema,
  decimalToMinorUnits,
  minorUnitsToDecimal,
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

test('uses exact integer minor units for decimal arithmetic', () => {
  assert.equal(decimalToMinorUnits('0.10') + decimalToMinorUnits('0.20'), 30n)
  assert.equal(minorUnitsToDecimal(decimalToMinorUnits('-12.34')), '-12.34')
  assert.equal(minorUnitsToDecimal(999999999999999999n), '9999999999999999.99')
  assert.throws(() => decimalToMinorUnits('1.001'), /Invalid decimal/)
  assert.throws(() => decimalToMinorUnits('1e3'), /Invalid decimal/)
})

test('sums only matching currencies and never performs implicit FX', () => {
  assert.deepEqual(sumMoney([
    { amount: '10.10', currency: 'EUR' },
    { amount: '-2.35', currency: 'EUR' },
    { amount: '0.25', currency: 'EUR' },
  ]), { amount: '8.00', currency: 'EUR' })
  assert.throws(() => sumMoney([
    { amount: '10.00', currency: 'EUR' },
    { amount: '10.00', currency: 'USD' },
  ]), /different currencies/)
  assert.deepEqual(sumMoney([]), { amount: '0.00', currency: 'EUR' })
})


test('pairs only unique, confirmed internal transfers', async () => {
  const { matchInternalTransfers } = await import('../src/lib/family-cfo.ts')
  const debit = { ...validTransaction, id: '10000000-0000-4000-8000-000000000011', accountId: '30000000-0000-4000-8000-000000000011', money: { amount: '-50.00', currency: 'EUR' } }
  const credit = { ...validTransaction, id: '10000000-0000-4000-8000-000000000012', accountId: '30000000-0000-4000-8000-000000000012', money: { amount: '50.00', currency: 'EUR' }, postedAt: '2026-11-14', transactionAt: '2026-11-14' }
  assert.deepEqual(matchInternalTransfers([debit, credit]), [{ debitId: debit.id, creditId: credit.id }])
  assert.deepEqual(matchInternalTransfers([debit, { ...credit, recordStatus: 'pending_review' }]), [])
  assert.deepEqual(matchInternalTransfers([debit, { ...credit, money: { amount: '49.99', currency: 'EUR' } }]), [])
})

test('cash flow excludes matched transfers and includes confirmed posted records only', async () => {
  const { calculateCashFlow } = await import('../src/lib/family-cfo.ts')
  const debit = { ...validTransaction, id: '10000000-0000-4000-8000-000000000021', accountId: '30000000-0000-4000-8000-000000000021', money: { amount: '-50.00', currency: 'EUR' } }
  const credit = { ...validTransaction, id: '10000000-0000-4000-8000-000000000022', accountId: '30000000-0000-4000-8000-000000000022', money: { amount: '50.00', currency: 'EUR' } }
  const salary = { ...validTransaction, id: '10000000-0000-4000-8000-000000000023', money: { amount: '2000.00', currency: 'EUR' } }
  const grocery = { ...validTransaction, id: '10000000-0000-4000-8000-000000000024', money: { amount: '-120.50', currency: 'EUR' } }
  const pending = { ...validTransaction, id: '10000000-0000-4000-8000-000000000025', status: 'pending' as const, money: { amount: '-999.00', currency: 'EUR' } }
  assert.deepEqual(calculateCashFlow([debit, credit, salary, grocery, pending], { start: '2026-11-01', end: '2026-11-30' }), {
    currency: 'EUR', inflows: '2000.00', outflows: '120.50', net: '1879.50',
    includedCount: 2, excludedTransferCount: 2,
  })
  const outsidePeriodCredit = { ...credit, postedAt: '2026-12-01', transactionAt: '2026-12-01' }
  const oneLegInPeriod = calculateCashFlow([debit, outsidePeriodCredit, salary], { start: '2026-11-01', end: '2026-11-30' })
  assert.equal(oneLegInPeriod.includedCount, 1)
  assert.equal(oneLegInPeriod.excludedTransferCount, 1)
  const onlyCreditInPeriod = calculateCashFlow([
    { ...debit, postedAt: '2026-12-01', transactionAt: '2026-12-01' },
    credit,
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
