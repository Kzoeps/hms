-- The Timberline hotel operations MVP
-- Run in a Supabase SQL editor. All money values are Nu. (ngultrum).
-- This script is intended for a new project; use a reviewed migration for an existing database.
create extension if not exists "pgcrypto";

do $$ begin
  create type public.guest_type as enum ('tourist', 'local');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.booking_status as enum ('confirmed', 'pending', 'checked-in', 'checked-out', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.rate_source as enum ('travel-agent', 'walk-in', 'local-default');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) > 0),
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);
create table if not exists public.room_types (
  id uuid primary key default gen_random_uuid(), name text not null, code text not null unique,
  capacity int not null check (capacity > 0), price_per_night_nu numeric(12,2) not null check (price_per_night_nu >= 0),
  total_rooms int not null check (total_rooms >= 0), created_at timestamptz not null default now()
);
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(), room_type_id uuid not null references public.room_types(id),
  room_number text not null unique, gender text, capacity int not null check (capacity > 0), active boolean not null default true
);
create table if not exists public.travel_agents (
  id uuid primary key default gen_random_uuid(), name text not null, contact text, email text,
  active boolean not null default true, effective_from date not null, effective_to date,
  created_at timestamptz not null default now(), check (effective_to is null or effective_to >= effective_from)
);
create table if not exists public.agent_room_rates (
  agent_id uuid not null references public.travel_agents(id) on delete cascade,
  room_type_id uuid not null references public.room_types(id), rate_per_night_nu numeric(12,2) not null check (rate_per_night_nu >= 0),
  primary key (agent_id, room_type_id)
);
create table if not exists public.agent_meal_rates (
  agent_id uuid primary key references public.travel_agents(id) on delete cascade,
  breakfast_nu numeric(12,2) not null default 0 check (breakfast_nu >= 0),
  lunch_nu numeric(12,2) not null default 0 check (lunch_nu >= 0),
  dinner_nu numeric(12,2) not null default 0 check (dinner_nu >= 0)
);
create table if not exists public.tourists (
  id uuid primary key default gen_random_uuid(), name text not null, nationality text,
  guest_type public.guest_type not null default 'tourist', email text, phone text, created_at timestamptz not null default now()
);
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(), confirmation text not null unique,
  check_in date not null, check_out date not null, status public.booking_status not null default 'pending',
  agent_id uuid references public.travel_agents(id), invoice_recipient text not null,
  guide_count int not null default 1 check (guide_count >= 0), driver_count int not null default 1 check (driver_count >= 0),
  guide_gender text, driver_gender text, staff_rooms_external boolean not null default false,
  complimentary_staff_accommodation boolean not null default true,
  notes text, created_at timestamptz not null default now(),
  check (check_out > check_in),
  check (not (staff_rooms_external and complimentary_staff_accommodation)),
  check ((agent_id is null) or (invoice_recipient is not null))
);
create table if not exists public.booking_tourists (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  tourist_id uuid not null references public.tourists(id),
  primary key (booking_id, tourist_id)
);
create table if not exists public.booking_rooms (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  room_type_id uuid not null references public.room_types(id),
  quantity int not null check (quantity > 0), nights int not null check (nights > 0), assigned_room_ids uuid[] not null default '{}',
  primary key (booking_id, room_type_id)
);
-- A snapshot is the commercial source of truth for a booking. It is deliberately not
-- cascaded on booking deletion: cancel a booking rather than deleting its audit trail.
create table if not exists public.rate_snapshots (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null unique references public.bookings(id) on delete restrict,
  source public.rate_source not null, agent_id uuid references public.travel_agents(id),
  room_rates jsonb not null, meal_rates jsonb not null,
  captured_at timestamptz not null default now(),
  check ((source = 'travel-agent' and agent_id is not null) or (source <> 'travel-agent' and agent_id is null))
);
create table if not exists public.booking_staff (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
  staff_type text not null check (staff_type in ('guide', 'driver')), name text, gender text,
  accommodation_mode text not null default 'complimentary' check (accommodation_mode in ('complimentary', 'external', 'none')),
  meals_complimentary boolean not null default true
);
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(), invoice_number text not null unique,
  booking_id uuid not null unique references public.bookings(id), recipient text not null,
  issued_at date not null default current_date, due_at date, status text not null default 'draft' check (status in ('paid', 'due', 'draft')),
  subtotal_nu numeric(12,2) not null default 0 check (subtotal_nu >= 0),
  service_charge_nu numeric(12,2) not null default 0 check (service_charge_nu >= 0),
  gst_nu numeric(12,2) not null default 0 check (gst_nu >= 0),
  total_nu numeric(12,2) not null default 0 check (total_nu >= 0),
  check (due_at is null or due_at >= issued_at),
  check (service_charge_nu = round(subtotal_nu * 0.10, 2)),
  check (gst_nu = round((subtotal_nu + service_charge_nu) * 0.05, 2)),
  check (total_nu = round(subtotal_nu + service_charge_nu + gst_nu, 2))
);

-- Staff complimentary lines are retained for operational reporting but can never add
-- money to a customer invoice. Invoice totals are recalculated by the database below.
create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null, quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price_nu numeric(12,2) not null default 0 check (unit_price_nu >= 0),
  guest_type public.guest_type, is_staff_complimentary boolean not null default false,
  line_total_nu numeric(12,2) generated always as (quantity * unit_price_nu) stored,
  check (not is_staff_complimentary or (unit_price_nu = 0 and guest_type is null))
);

-- The policy helper is SECURITY DEFINER so the policy lookup does not recurse through
-- profiles RLS. It returns only a boolean and is executable by signed-in users.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.validate_rate_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  item jsonb;
  required_meals constant text[] := array['breakfast', 'lunch', 'dinner'];
begin
  if jsonb_typeof(new.room_rates) <> 'object' or jsonb_typeof(new.meal_rates) <> 'object' then
    raise exception 'rate snapshot rates must be JSON objects';
  end if;
  if not exists (select 1 from jsonb_each(new.room_rates)) then
    raise exception 'rate snapshot must include at least one room rate';
  end if;
  if exists (
    select 1 from public.booking_rooms br
    where br.booking_id = new.booking_id
      and not (new.room_rates ? br.room_type_id::text)
  ) then
    raise exception 'rate snapshot is missing a booked room type rate';
  end if;
  if not (new.meal_rates ?& required_meals) then
    raise exception 'rate snapshot must include breakfast, lunch, and dinner';
  end if;
  for item in select value from jsonb_each(new.room_rates) union all select value from jsonb_each(new.meal_rates) loop
    if jsonb_typeof(item) <> 'number' or (item #>> '{}')::numeric < 0 then
      raise exception 'rate snapshot values must be non-negative numbers';
    end if;
  end loop;
  return new;
end;
$$;

create or replace function public.prevent_rate_snapshot_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
  raise exception 'rate snapshots are immutable';
end;
$$;

create or replace function public.validate_booking_room_rate_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if exists (
    select 1 from public.rate_snapshots rs
    where rs.booking_id = new.booking_id
      and not (rs.room_rates ? new.room_type_id::text)
  ) then
    raise exception 'rate snapshot is missing a booked room type rate';
  end if;
  return new;
end;
$$;

create or replace function public.set_invoice_totals()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
  new.subtotal_nu := coalesce((
    select sum(line_total_nu) from public.invoice_lines
    where invoice_id = new.id and not is_staff_complimentary
  ), 0);
  new.service_charge_nu := round(new.subtotal_nu * 0.10, 2);
  new.gst_nu := round((new.subtotal_nu + new.service_charge_nu) * 0.05, 2);
  new.total_nu := round(new.subtotal_nu + new.service_charge_nu + new.gst_nu, 2);
  return new;
end;
$$;

create or replace function public.recalculate_invoice_totals()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  affected_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
  subtotal numeric(12,2);
begin
  -- Lock the parent before calculating so concurrent line writes serialize.
  perform 1 from public.invoices where id = affected_invoice for update;
  select coalesce(sum(line_total_nu), 0)::numeric(12,2) into subtotal
  from public.invoice_lines
  where invoice_id = affected_invoice and not is_staff_complimentary;
  update public.invoices
  set subtotal_nu = subtotal,
      service_charge_nu = round(subtotal * 0.10, 2),
      gst_nu = round((subtotal + round(subtotal * 0.10, 2)) * 0.05, 2),
      total_nu = round(subtotal + round(subtotal * 0.10, 2) + round((subtotal + round(subtotal * 0.10, 2)) * 0.05, 2), 2)
  where id = affected_invoice;
  if tg_op = 'UPDATE' and old.invoice_id is distinct from new.invoice_id then
    perform public.recalculate_invoice_totals_for(old.invoice_id);
  end if;
  return null;
end;
$$;

-- Small helper used when a line is moved between invoices.
create or replace function public.recalculate_invoice_totals_for(target_invoice uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  subtotal numeric(12,2);
begin
  perform 1 from public.invoices where id = target_invoice for update;
  select coalesce(sum(line_total_nu), 0)::numeric(12,2) into subtotal
  from public.invoice_lines
  where invoice_id = target_invoice and not is_staff_complimentary;
  update public.invoices
  set subtotal_nu = subtotal,
      service_charge_nu = round(subtotal * 0.10, 2),
      gst_nu = round((subtotal + round(subtotal * 0.10, 2)) * 0.05, 2),
      total_nu = round(subtotal + round(subtotal * 0.10, 2) + round((subtotal + round(subtotal * 0.10, 2)) * 0.05, 2), 2)
  where id = target_invoice;
end;
$$;

create or replace function public.prevent_paid_invoice_line_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  invoice_status text;
  affected_invoice uuid;
begin
  if tg_op = 'DELETE' then
    affected_invoice := old.invoice_id;
  else
    affected_invoice := new.invoice_id;
  end if;
  select status into invoice_status from public.invoices where id = affected_invoice;
  if invoice_status = 'paid' then
    raise exception 'paid invoice lines are immutable';
  end if;
  if tg_op = 'UPDATE' and old.invoice_id is distinct from new.invoice_id then
    if exists (select 1 from public.invoices where id = old.invoice_id and status = 'paid') then
      raise exception 'paid invoice lines are immutable';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.prevent_booking_rate_source_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if old.agent_id is distinct from new.agent_id
     and exists (select 1 from public.rate_snapshots where booking_id = old.id) then
    raise exception 'booking agent cannot change after rate snapshot capture';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_paid_invoice_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if old.status = 'paid' then
    raise exception 'paid invoices are immutable';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists booking_rate_source_guard on public.bookings;
create trigger booking_rate_source_guard before update on public.bookings
for each row execute function public.prevent_booking_rate_source_mutation();
drop trigger if exists booking_room_rate_snapshot_guard on public.booking_rooms;
create trigger booking_room_rate_snapshot_guard before insert or update on public.booking_rooms
for each row execute function public.validate_booking_room_rate_snapshot();
drop trigger if exists rate_snapshot_validate on public.rate_snapshots;
create trigger rate_snapshot_validate before insert on public.rate_snapshots
for each row execute function public.validate_rate_snapshot();
drop trigger if exists rate_snapshot_immutable on public.rate_snapshots;
create trigger rate_snapshot_immutable before update or delete on public.rate_snapshots
for each row execute function public.prevent_rate_snapshot_mutation();
drop trigger if exists invoices_set_totals on public.invoices;
create trigger invoices_set_totals before insert or update on public.invoices
for each row execute function public.set_invoice_totals();
drop trigger if exists invoices_paid_guard on public.invoices;
create trigger invoices_paid_guard before update or delete on public.invoices
for each row execute function public.prevent_paid_invoice_mutation();
drop trigger if exists invoice_lines_paid_guard on public.invoice_lines;
create trigger invoice_lines_paid_guard before insert or update or delete on public.invoice_lines
for each row execute function public.prevent_paid_invoice_line_mutation();
drop trigger if exists invoice_lines_recalculate on public.invoice_lines;
create trigger invoice_lines_recalculate after insert or update or delete on public.invoice_lines
for each row execute function public.recalculate_invoice_totals();

-- Every table exposed through PostgREST is RLS protected. No policy is granted to anon.
alter table public.profiles enable row level security;
alter table public.room_types enable row level security;
alter table public.rooms enable row level security;
alter table public.travel_agents enable row level security;
alter table public.agent_room_rates enable row level security;
alter table public.agent_meal_rates enable row level security;
alter table public.tourists enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_tourists enable row level security;
alter table public.booking_rooms enable row level security;
alter table public.rate_snapshots enable row level security;
alter table public.booking_staff enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

-- Make the API privilege boundary explicit as well as policy-protected.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile" on public.profiles for select to authenticated
using (id = auth.uid());
drop policy if exists "admins can manage profiles" on public.profiles;
create policy "admins can manage profiles" on public.profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- All operational tables are admin-only in this MVP.
drop policy if exists "admins can manage room types" on public.room_types;
create policy "admins can manage room types" on public.room_types for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can manage rooms" on public.rooms;
create policy "admins can manage rooms" on public.rooms for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can manage agents" on public.travel_agents;
create policy "admins can manage agents" on public.travel_agents for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can manage agent room rates" on public.agent_room_rates;
create policy "admins can manage agent room rates" on public.agent_room_rates for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can manage agent meal rates" on public.agent_meal_rates;
create policy "admins can manage agent meal rates" on public.agent_meal_rates for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can manage guests" on public.tourists;
create policy "admins can manage guests" on public.tourists for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can manage bookings" on public.bookings;
create policy "admins can manage bookings" on public.bookings for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can manage booking guests" on public.booking_tourists;
create policy "admins can manage booking guests" on public.booking_tourists for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can manage booking rooms" on public.booking_rooms;
create policy "admins can manage booking rooms" on public.booking_rooms for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can read rate snapshots" on public.rate_snapshots;
create policy "admins can read rate snapshots" on public.rate_snapshots for select to authenticated using (public.is_admin());
drop policy if exists "admins can create rate snapshots" on public.rate_snapshots;
create policy "admins can create rate snapshots" on public.rate_snapshots for insert to authenticated with check (public.is_admin());
drop policy if exists "admins can manage booking staff" on public.booking_staff;
create policy "admins can manage booking staff" on public.booking_staff for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can manage invoices" on public.invoices;
create policy "admins can manage invoices" on public.invoices for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can manage invoice lines" on public.invoice_lines;
create policy "admins can manage invoice lines" on public.invoice_lines for all to authenticated using (public.is_admin()) with check (public.is_admin());
