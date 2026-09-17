create table if not exists public.tenants (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text not null default '',
    room_number text not null,
    monthly_rent numeric(12, 2) not null check (monthly_rent >= 0),
    joining_date date not null,
    created_at timestamptz not null default now()
);

create table if not exists public.rent_payments (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    month integer not null check (month between 1 and 12),
    year integer not null check (year between 2000 and 2200),
    amount numeric(12, 2) not null check (amount >= 0),
    status text not null default 'UNPAID' check (status in ('PAID', 'UNPAID')),
    payment_date date,
    created_at timestamptz not null default now(),
    unique (tenant_id, month, year)
);

alter table public.tenants enable row level security;
alter table public.rent_payments enable row level security;

drop policy if exists "Public can read tenants" on public.tenants;
drop policy if exists "Public can add tenants" on public.tenants;
drop policy if exists "Public can edit tenants" on public.tenants;
drop policy if exists "Public can delete tenants" on public.tenants;
drop policy if exists "Public can read rent payments" on public.rent_payments;
drop policy if exists "Public can add rent payments" on public.rent_payments;
drop policy if exists "Public can edit rent payments" on public.rent_payments;
drop policy if exists "Public can delete rent payments" on public.rent_payments;

create policy "Public can read tenants" on public.tenants for select to anon using (true);
create policy "Public can add tenants" on public.tenants for insert to anon with check (true);
create policy "Public can edit tenants" on public.tenants for update to anon using (true) with check (true);
create policy "Public can delete tenants" on public.tenants for delete to anon using (true);

create policy "Public can read rent payments" on public.rent_payments for select to anon using (true);
create policy "Public can add rent payments" on public.rent_payments for insert to anon with check (true);
create policy "Public can edit rent payments" on public.rent_payments for update to anon using (true) with check (true);
create policy "Public can delete rent payments" on public.rent_payments for delete to anon using (true);