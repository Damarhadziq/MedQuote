create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  composition text not null check (length(trim(composition)) > 0),
  package_type text not null check (package_type in ('Box', 'Botol', 'Tube')),
  package_detail text not null check (length(trim(package_detail)) > 0),
  hna numeric(15, 2) not null check (hna > 0),
  tax_percentage numeric(5, 2) not null default 11
    check (tax_percentage >= 0 and tax_percentage <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_number text not null,
  recipient_name text not null check (length(trim(recipient_name)) > 0),
  institution text,
  contact_person text,
  contact_number text,
  offer_date date not null default current_date,
  valid_until date,
  general_discount numeric(5, 2) not null default 0
    check (general_discount >= 0 and general_discount <= 100),
  discount_mode text not null default 'per_product'
    check (discount_mode in ('general', 'per_product')),
  notes text,
  payment_terms text,
  shipping_information text,
  additional_notes text,
  total numeric(15, 2) not null default 0 check (total >= 0),
  status text not null default 'Tersimpan',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_user_number_unique unique (user_id, offer_number),
  constraint offers_valid_date_check
    check (valid_until is null or valid_until >= offer_date)
);

create table if not exists public.offer_items (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  composition_snapshot text not null,
  package_snapshot text not null,
  quantity integer not null check (quantity > 0),
  hna_snapshot numeric(15, 2) not null check (hna_snapshot >= 0),
  tax_percentage numeric(5, 2) not null
    check (tax_percentage >= 0 and tax_percentage <= 100),
  price_with_tax numeric(15, 2) not null check (price_with_tax >= 0),
  discount_percentage numeric(5, 2) not null default 0
    check (discount_percentage >= 0 and discount_percentage <= 100),
  final_unit_price numeric(15, 2) not null check (final_unit_price >= 0),
  subtotal numeric(15, 2) not null check (subtotal >= 0)
);

create index if not exists products_user_id_idx
  on public.products(user_id);
create index if not exists products_user_name_idx
  on public.products(user_id, name);
create index if not exists offers_user_date_idx
  on public.offers(user_id, offer_date desc);
create index if not exists offers_user_recipient_idx
  on public.offers(user_id, recipient_name);
create index if not exists offer_items_offer_id_idx
  on public.offer_items(offer_id);
create index if not exists offer_items_product_id_idx
  on public.offer_items(product_id);

alter table public.products enable row level security;
alter table public.offers enable row level security;
alter table public.offer_items enable row level security;

drop policy if exists "products_select_own" on public.products;
create policy "products_select_own"
  on public.products for select
  using (auth.uid() = user_id);

drop policy if exists "products_insert_own" on public.products;
create policy "products_insert_own"
  on public.products for insert
  with check (auth.uid() = user_id);

drop policy if exists "products_update_own" on public.products;
create policy "products_update_own"
  on public.products for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "products_delete_own" on public.products;
create policy "products_delete_own"
  on public.products for delete
  using (auth.uid() = user_id);

drop policy if exists "offers_select_own" on public.offers;
create policy "offers_select_own"
  on public.offers for select
  using (auth.uid() = user_id);

drop policy if exists "offers_insert_own" on public.offers;
create policy "offers_insert_own"
  on public.offers for insert
  with check (auth.uid() = user_id);

drop policy if exists "offers_update_own" on public.offers;
create policy "offers_update_own"
  on public.offers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "offers_delete_own" on public.offers;
create policy "offers_delete_own"
  on public.offers for delete
  using (auth.uid() = user_id);

drop policy if exists "offer_items_select_own" on public.offer_items;
create policy "offer_items_select_own"
  on public.offer_items for select
  using (
    exists (
      select 1 from public.offers
      where offers.id = offer_items.offer_id
        and offers.user_id = auth.uid()
    )
  );

drop policy if exists "offer_items_insert_own" on public.offer_items;
create policy "offer_items_insert_own"
  on public.offer_items for insert
  with check (
    exists (
      select 1 from public.offers
      where offers.id = offer_items.offer_id
        and offers.user_id = auth.uid()
    )
  );

drop policy if exists "offer_items_update_own" on public.offer_items;
create policy "offer_items_update_own"
  on public.offer_items for update
  using (
    exists (
      select 1 from public.offers
      where offers.id = offer_items.offer_id
        and offers.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.offers
      where offers.id = offer_items.offer_id
        and offers.user_id = auth.uid()
    )
  );

drop policy if exists "offer_items_delete_own" on public.offer_items;
create policy "offer_items_delete_own"
  on public.offer_items for delete
  using (
    exists (
      select 1 from public.offers
      where offers.id = offer_items.offer_id
        and offers.user_id = auth.uid()
    )
  );

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists offers_set_updated_at on public.offers;
create trigger offers_set_updated_at
before update on public.offers
for each row execute function public.set_updated_at();

-- ─── Templates ───────────────────────────────────────────────────────────────

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  items text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists templates_user_id_idx
  on public.templates(user_id);

alter table public.templates enable row level security;

drop policy if exists "templates_select_own" on public.templates;
create policy "templates_select_own"
  on public.templates for select
  using (auth.uid() = user_id);

drop policy if exists "templates_insert_own" on public.templates;
create policy "templates_insert_own"
  on public.templates for insert
  with check (auth.uid() = user_id);

drop policy if exists "templates_update_own" on public.templates;
create policy "templates_update_own"
  on public.templates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "templates_delete_own" on public.templates;
create policy "templates_delete_own"
  on public.templates for delete
  using (auth.uid() = user_id);

-- ─── Profiles & User Management ───────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'detailer' check (role in ('superadmin', 'detailer', 'manager')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  territory text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "profiles_insert_all" on public.profiles;
create policy "profiles_insert_all"
  on public.profiles for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "profiles_update_all" on public.profiles;
create policy "profiles_update_all"
  on public.profiles for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "profiles_delete_all" on public.profiles;
create policy "profiles_delete_all"
  on public.profiles for delete
  using (auth.role() = 'authenticated');


