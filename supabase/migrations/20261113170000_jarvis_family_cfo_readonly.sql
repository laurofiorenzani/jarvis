-- First read-only Family CFO persistence foundation.
-- Personal records are owner-scoped. Only authenticated SELECT is allowed;
-- all writes must go through a server-side API that derives owner_user_id
-- from the verified JWT and validates every related account. No bank connector,
-- household sharing, payment, transfer, trading, or external action is added.

create table if not exists public.jarvis_cfo_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  institution_label text not null check (length(btrim(institution_label)) between 1 and 120),
  account_label text not null check (length(btrim(account_label)) between 1 and 120),
  account_type text not null check (account_type in (
    'current', 'checking', 'savings', 'credit_card', 'loan',
    'mortgage', 'pension', 'investment', 'other'
  )),
  masked_identifier text check (masked_identifier is null or length(masked_identifier) <= 32),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'active' check (status in ('active', 'inactive', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_user_id)
);

create index if not exists jarvis_cfo_accounts_owner_idx
  on public.jarvis_cfo_accounts (owner_user_id, status);

create table if not exists public.jarvis_cfo_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  internal_transfer_pair_id uuid,
  transaction_at date not null,
  posted_at date,
  description text not null check (length(btrim(description)) between 1 and 500),
  merchant text check (merchant is null or length(merchant) <= 200),
  amount numeric(20,2) not null check (amount > '-Infinity'::numeric and amount < 'Infinity'::numeric),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  status text not null check (status in ('pending', 'posted', 'reversed')),
  confidence text not null check (confidence in ('verified', 'user_confirmed', 'estimated', 'unknown')),
  record_status text not null default 'pending_review'
    check (record_status in ('pending_review', 'confirmed', 'rejected', 'superseded')),
  source_type text not null check (source_type in ('manual', 'bank_export', 'provider_api', 'document', 'calculation')),
  source_name text not null check (length(btrim(source_name)) between 1 and 120),
  source_record_id text check (source_record_id is null or length(source_record_id) <= 200),
  observed_at timestamptz not null,
  effective_at date not null,
  imported_at timestamptz not null default now(),
  provenance text check (provenance is null or length(provenance) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (account_id, owner_user_id)
    references public.jarvis_cfo_accounts (id, owner_user_id) on delete cascade
);

create index if not exists jarvis_cfo_transactions_owner_date_idx
  on public.jarvis_cfo_transactions (owner_user_id, posted_at desc, transaction_at desc);

create index if not exists jarvis_cfo_transactions_account_date_idx
  on public.jarvis_cfo_transactions (account_id, transaction_at desc);

create index if not exists jarvis_cfo_transactions_transfer_pair_idx
  on public.jarvis_cfo_transactions (owner_user_id, internal_transfer_pair_id)
  where internal_transfer_pair_id is not null;

create unique index if not exists jarvis_cfo_transactions_source_record_uidx
  on public.jarvis_cfo_transactions (owner_user_id, account_id, source_type, source_record_id)
  where source_record_id is not null;

create table if not exists public.jarvis_cfo_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  observed_at timestamptz not null,
  amount numeric(20,2) not null check (amount > '-Infinity'::numeric and amount < 'Infinity'::numeric),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  confidence text not null check (confidence in ('verified', 'user_confirmed', 'estimated', 'unknown')),
  source_type text not null check (source_type in ('manual', 'bank_export', 'provider_api', 'document', 'calculation')),
  source_name text not null check (length(btrim(source_name)) between 1 and 120),
  source_record_id text check (source_record_id is null or length(source_record_id) <= 200),
  effective_at date not null,
  imported_at timestamptz not null default now(),
  provenance text check (provenance is null or length(provenance) <= 500),
  created_at timestamptz not null default now(),
  foreign key (account_id, owner_user_id)
    references public.jarvis_cfo_accounts (id, owner_user_id) on delete cascade
);

create index if not exists jarvis_cfo_balance_snapshots_owner_observed_idx
  on public.jarvis_cfo_balance_snapshots (owner_user_id, observed_at desc);

create index if not exists jarvis_cfo_balance_snapshots_account_observed_idx
  on public.jarvis_cfo_balance_snapshots (account_id, observed_at desc);

alter table public.jarvis_cfo_accounts enable row level security;
alter table public.jarvis_cfo_transactions enable row level security;
alter table public.jarvis_cfo_balance_snapshots enable row level security;

drop policy if exists "Users can read their own CFO accounts"
  on public.jarvis_cfo_accounts;
create policy "Users can read their own CFO accounts"
  on public.jarvis_cfo_accounts for select to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists "Users can read their own CFO transactions"
  on public.jarvis_cfo_transactions;
create policy "Users can read their own CFO transactions"
  on public.jarvis_cfo_transactions for select to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists "Users can read their own CFO balance snapshots"
  on public.jarvis_cfo_balance_snapshots;
create policy "Users can read their own CFO balance snapshots"
  on public.jarvis_cfo_balance_snapshots for select to authenticated
  using ((select auth.uid()) = owner_user_id);

revoke all on table public.jarvis_cfo_accounts from public, anon, authenticated, service_role;
revoke all on table public.jarvis_cfo_transactions from public, anon, authenticated, service_role;
revoke all on table public.jarvis_cfo_balance_snapshots from public, anon, authenticated, service_role;
grant select on table public.jarvis_cfo_accounts to authenticated;
grant select on table public.jarvis_cfo_transactions to authenticated;
grant select on table public.jarvis_cfo_balance_snapshots to authenticated;

grant select, insert, update, delete on table public.jarvis_cfo_accounts to service_role;
grant select, insert, update, delete on table public.jarvis_cfo_transactions to service_role;
grant select, insert, update, delete on table public.jarvis_cfo_balance_snapshots to service_role;
