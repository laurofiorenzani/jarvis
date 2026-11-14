-- Family CFO currency exponent contract, versioned and fail-closed.
-- Registry rows are immutable snapshots from a pinned ISO 4217 source list.
-- No currency is accepted until an explicitly reviewed registry snapshot is seeded.
create table if not exists public.jarvis_cfo_currency_registry (
  currency_code varchar(3) not null check (currency_code ~ '^[A-Z]{3}$'),
  registry_version text not null check (length(btrim(registry_version)) between 1 and 80),
  minor_unit smallint not null check (minor_unit between 0 and 4),
  effective_from date not null,
  effective_to date,
  source_reference text not null check (length(btrim(source_reference)) between 1 and 500),
  source_retrieved_at timestamptz not null,
  primary key (currency_code, registry_version, effective_from),
  check (effective_to is null or effective_to > effective_from)
);

create index if not exists jarvis_cfo_currency_registry_lookup_idx
  on public.jarvis_cfo_currency_registry (currency_code, effective_from, effective_to);

create or replace function public.jarvis_cfo_amount_matches_currency_exponent(
  p_amount numeric,
  p_currency varchar,
  p_effective_at date,
  p_registry_version text
) returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*) = 1
    and coalesce(
      pg_catalog.bool_and(p_amount = pg_catalog.trunc(p_amount, r.minor_unit)),
      false
    )
  from public.jarvis_cfo_currency_registry as r
  where r.currency_code = p_currency
    and r.registry_version = p_registry_version
    and p_effective_at >= r.effective_from
    and (r.effective_to is null or p_effective_at < r.effective_to);
$$;

revoke all on function public.jarvis_cfo_amount_matches_currency_exponent(numeric, varchar, date, text) from public, anon, authenticated;
grant execute on function public.jarvis_cfo_amount_matches_currency_exponent(numeric, varchar, date, text) to service_role;

alter table public.jarvis_cfo_transactions
  alter column amount type numeric,
  add column currency_registry_version text not null;
alter table public.jarvis_cfo_transactions
  add constraint jarvis_cfo_transactions_currency_exponent_check
  check (public.jarvis_cfo_amount_matches_currency_exponent(amount, currency, effective_at, currency_registry_version));

alter table public.jarvis_cfo_balance_snapshots
  alter column amount type numeric,
  add column currency_registry_version text not null;
alter table public.jarvis_cfo_balance_snapshots
  add constraint jarvis_cfo_snapshots_currency_exponent_check
  check (public.jarvis_cfo_amount_matches_currency_exponent(amount, currency, effective_at, currency_registry_version));

alter table public.jarvis_cfo_accounts
  add column currency_registry_version text not null;
alter table public.jarvis_cfo_accounts
  add constraint jarvis_cfo_accounts_currency_registry_check
  check (public.jarvis_cfo_amount_matches_currency_exponent(0, currency, current_date, currency_registry_version));

alter table public.jarvis_cfo_currency_registry enable row level security;
revoke all on table public.jarvis_cfo_currency_registry from public, anon, authenticated;
grant select on table public.jarvis_cfo_currency_registry to service_role;
