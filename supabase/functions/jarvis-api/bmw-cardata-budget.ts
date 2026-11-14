import {
  BMW_CARDATA_DAILY_REQUEST_LIMIT,
  type BMWDailyRequestBudget,
} from '../../../src/lib/integrations/bmw-cardata.ts'

export type ConsumeRateLimit = (
  bucket: string,
  limit: number,
  windowSeconds: number,
) => Promise<boolean | null>

/**
 * Adapts JARVIS's existing atomic per-user rate-limit RPC to BMW's 50/day cap.
 * The rolling 24-hour window is intentionally stricter than a calendar day.
 */
export function createBMWCardataDailyBudget(
  verifiedUserId: string,
  consumeLimit: ConsumeRateLimit,
): BMWDailyRequestBudget {
  if (!verifiedUserId.trim()) throw new TypeError('A verified JARVIS user ID is required.')
  return {
    async consume(ownerId, _utcDate, requestedLimit) {
      if (ownerId !== verifiedUserId || requestedLimit !== BMW_CARDATA_DAILY_REQUEST_LIMIT) {
        return false
      }
      return await consumeLimit('bmw_cardata_rest_daily', BMW_CARDATA_DAILY_REQUEST_LIMIT, 24 * 60 * 60) === true
    },
  }
}
