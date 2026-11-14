begin;

select plan(12);

-- Synthetic registry fixtures only. Production currency metadata remains unseeded
-- until the official pinned SIX/ISO List One snapshot is reviewed and committed.
insert into public.jarvis_cfo_currency_registry
  (currency_code, registry_version, minor_unit, effective_from, source_reference, source_retrieved_at)
values
  ('EUR', 'synthetic-test-v1', 2, '2020-01-01', 'synthetic fixture; not production metadata', now()),
  ('JPY', 'synthetic-test-v1', 0, '2020-01-01', 'synthetic fixture; not production metadata', now()),
  ('KWD', 'synthetic-test-v1', 3, '2020-01-01', 'synthetic fixture; not production metadata', now()),
  -- Deliberately overlapping EUR interval to prove ambiguous metadata fails closed.
  ('EUR', 'synthetic-test-v1', 3, '2025-01-01', 'synthetic overlapping fixture', now());

select ok(public.jarvis_cfo_amount_matches_currency_exponent(12.34, 'EUR', '2026-11-13', 'synthetic-test-v1'), 'EUR accepts two fractional digits');
select ok(public.jarvis_cfo_amount_matches_currency_exponent(1200, 'JPY', '2026-11-13', 'synthetic-test-v1'), 'JPY accepts zero fractional digits');
select ok(public.jarvis_cfo_amount_matches_currency_exponent(1.234, 'KWD', '2026-11-13', 'synthetic-test-v1'), 'KWD accepts three fractional digits');
select ok(not public.jarvis_cfo_amount_matches_currency_exponent(12.345, 'EUR', '2026-11-13', 'synthetic-test-v1'), 'EUR rejects more than two fractional digits');
select ok(not public.jarvis_cfo_amount_matches_currency_exponent(1.2300000001, 'EUR', '2026-11-13', 'synthetic-test-v1'), 'EUR rejects precision beyond the currency exponent without scale rounding');
select ok(not public.jarvis_cfo_amount_matches_currency_exponent(1.2300000000000000001, 'EUR', '2026-11-13', 'synthetic-test-v1'), 'EUR preserves and rejects high-precision decimal input');
select ok(not public.jarvis_cfo_amount_matches_currency_exponent(1200.01, 'JPY', '2026-11-13', 'synthetic-test-v1'), 'JPY rejects fractional amounts');
select ok(not public.jarvis_cfo_amount_matches_currency_exponent(1.2345, 'KWD', '2026-11-13', 'synthetic-test-v1'), 'KWD rejects more than three fractional digits');
select ok(not public.jarvis_cfo_amount_matches_currency_exponent(1.00, 'XXX', '2026-11-13', 'synthetic-test-v1'), 'unknown currency is rejected');
select ok(not public.jarvis_cfo_amount_matches_currency_exponent(1.00, 'EUR', '2019-12-31', 'synthetic-test-v1'), 'currency before effective date is rejected');
select ok(not public.jarvis_cfo_amount_matches_currency_exponent(1.00, 'EUR', '2026-11-13', 'unapproved-version'), 'unknown registry version is rejected');
select ok(not public.jarvis_cfo_amount_matches_currency_exponent(12.34, 'EUR', '2026-11-13', 'synthetic-test-v1'), 'overlapping effective-dated registry rows are rejected as ambiguous');

select * from finish();
rollback;
