import {
  BMW_CARDATA_DAILY_REQUEST_LIMIT,
} from '../../../src/lib/integrations/bmw-cardata.ts'
import {
  createBMWCardataDailyBudget,
  type ConsumeRateLimit,
} from './bmw-cardata-budget.ts'

function assertEquals(actual: unknown, expected: unknown, message = 'unexpected value'): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
}

const userA = '00000000-0000-4000-8000-000000000051'

Deno.test('uses the existing atomic per-user limiter with a strict rolling 24-hour window', async () => {
  const calls: Array<{ bucket: string; limit: number; windowSeconds: number }> = []
  const consume: ConsumeRateLimit = async (bucket, limit, windowSeconds) => {
    calls.push({ bucket, limit, windowSeconds })
    return true
  }
  const budget = createBMWCardataDailyBudget(userA, consume)
  const allowed = await budget.consume(userA, '2026-11-13', BMW_CARDATA_DAILY_REQUEST_LIMIT)
  assertEquals(allowed, true)
  assertEquals(calls.length, 1)
  assertEquals(calls[0].bucket, 'bmw_cardata_rest_daily')
  assertEquals(calls[0].limit, 50)
  assertEquals(calls[0].windowSeconds, 86400)
})

Deno.test('fails closed for a different owner or a raised request limit', async () => {
  let calls = 0
  const budget = createBMWCardataDailyBudget(userA, async () => { calls++; return true })
  assertEquals(await budget.consume('user-b', '2026-11-13', 50), false)
  assertEquals(await budget.consume(userA, '2026-11-13', 100), false)
  assertEquals(calls, 0)
})

Deno.test('fails closed when the atomic limiter is unavailable or denies a request', async () => {
  const unavailable = createBMWCardataDailyBudget(userA, async () => null)
  const denied = createBMWCardataDailyBudget(userA, async () => false)
  assertEquals(await unavailable.consume(userA, '2026-11-13', 50), false)
  assertEquals(await denied.consume(userA, '2026-11-13', 50), false)
})

Deno.test('requires a verified owner ID before creating the budget adapter', () => {
  let caught = false
  try {
    createBMWCardataDailyBudget('', async () => true)
  } catch {
    caught = true
  }
  assertEquals(caught, true)
})
