-- L1 schema v1, file 5 of 9: memberships and the banner add-on (task 3.5). Stripe Billing is the system of record; these
-- rows are what the subscription and invoice webhooks store, written by the webhook handler only (service role). No
-- amounts are stored: a plan's price is config/business.ts and the invoice is Stripe's.

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  -- One current membership per professional; a new subscription after a cancellation updates this row.
  professional_id uuid not null unique references public.professionals (id) on delete cascade,
  status public.membership_status not null default 'none',
  interval public.billing_interval,
  -- Next renewal (active), the renewal that failed (past_due) or the last day of access (cancelled).
  current_period_end timestamptz,
  -- The business.membershipGraceDays grace period counts from here.
  payment_failed_at timestamptz,
  cancelled_at timestamptz,
  started_at timestamptz,
  -- Free months an admin granted (screen 42): no charge until then.
  comp_until timestamptz,
  -- An admin's grace extension (membershipAdmin.graceExtendDays) for this membership only.
  grace_extended_until timestamptz,
  stripe_customer_id text check (stripe_customer_id ~ '^cus_'),
  stripe_subscription_id text unique check (stripe_subscription_id ~ '^sub_'),
  last_invoice_id text check (last_invoice_id ~ '^in_'),
  last_invoice_number text check (char_length(last_invoice_number) <= 40),
  last_invoice_status public.invoice_status,
  last_invoice_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_interval check (status = 'none' or interval is not null)
);

create index memberships_status_idx on public.memberships (status);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null unique references public.professionals (id) on delete cascade,
  -- The home carousel shows active banners (January batch). Maintained by the subscription webhooks.
  active boolean not null default false,
  stripe_subscription_id text unique check (stripe_subscription_id ~ '^sub_'),
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger memberships_set_updated_at before update on public.memberships
  for each row execute function private.set_updated_at();
create trigger banners_set_updated_at before update on public.banners
  for each row execute function private.set_updated_at();

alter table public.memberships enable row level security;
alter table public.banners enable row level security;

revoke all on table public.memberships, public.banners from anon, authenticated;
grant select on table public.memberships, public.banners to authenticated;

create policy memberships_select on public.memberships for select to authenticated
  using (professional_id = (select private.my_professional_id()) or (select private.is_admin()));
create policy banners_select on public.banners for select to authenticated
  using (professional_id = (select private.my_professional_id()) or (select private.is_admin()));
