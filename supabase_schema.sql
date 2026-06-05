-- POSAgent Database Schema
-- รันใน Supabase Dashboard → SQL Editor → New query

-- ── Shops ──────────────────────────────────────────────────────────────────
create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text default '🍕',
  created_at timestamptz default now()
);

-- ── Channels ───────────────────────────────────────────────────────────────
create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  name text not null,
  gp_percent numeric default 0,
  ads_default numeric default 0,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- ── Ingredients ────────────────────────────────────────────────────────────
create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  name text not null,
  category text default '',
  unit_type text default 'gram',
  purchase_qty numeric not null default 1,
  purchase_price numeric not null default 0,
  cost_per_unit numeric not null default 0,
  stock numeric default 0,
  low_stock_threshold numeric default 0,
  note text default '',
  purchase_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Menus ──────────────────────────────────────────────────────────────────
create table if not exists menus (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  name text not null,
  menu_type text default 'พิซซ่า',
  size text default '',
  selling_price numeric not null default 0,
  latest_recipe jsonb default '[]'::jsonb,
  note text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- เพิ่มคอลัมน์สำหรับตารางที่มีอยู่แล้ว
alter table menus add column if not exists menu_type text default 'พิซซ่า';

-- ── Orders ─────────────────────────────────────────────────────────────────
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  channel_name text not null,
  gp_percent numeric default 0,
  gp_enabled boolean default true,
  gp_amount numeric default 0,
  ads_fee numeric default 0,
  coupon_discount numeric default 0,
  items jsonb default '[]'::jsonb,
  subtotal numeric default 0,
  total_cost numeric default 0,
  net_received numeric default 0,
  net_profit numeric default 0,
  item_count integer default 0,
  created_at timestamptz default now()
);

-- ── Market / Shopping list (ฟีเจอร์ซื้อของที่ห้าง) ──────────────────────────
create table if not exists market_items (
  id uuid primary key default gen_random_uuid(),
  shop_key text not null,
  name text not null,
  bought boolean default false,
  qty text default '',
  price numeric default 0,
  shelf_days integer,
  is_custom boolean default false,
  sort integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table shops enable row level security;
alter table channels enable row level security;
alter table ingredients enable row level security;
alter table menus enable row level security;
alter table orders enable row level security;
alter table market_items enable row level security;

-- อนุญาตเฉพาะ user ที่ login แล้ว (whitelist จัดการที่ frontend)
drop policy if exists "authenticated_all" on shops;
drop policy if exists "authenticated_all" on channels;
drop policy if exists "authenticated_all" on ingredients;
drop policy if exists "authenticated_all" on menus;
drop policy if exists "authenticated_all" on orders;
drop policy if exists "authenticated_all" on market_items;
create policy "authenticated_all" on shops for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all" on channels for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all" on ingredients for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all" on menus for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all" on orders for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all" on market_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
