-- ThatHappyHour Supabase schema
-- Creates roles, profiles, restaurants, promotions, follows, notifications, images, and supporting structures
-- Safe to run in an empty project. Re-run will error on existing objects; wrap in IF NOT EXISTS where possible.

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type user_role as enum ('user','vendor','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('trial','active','cancelled','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type discount_type as enum ('percentage','fixed_amount','bogo','free_item');
exception when duplicate_object then null; end $$;

do $$ begin
  create type promotion_category as enum ('food','drinks','coffee','bakery','hookah','events');
exception when duplicate_object then null; end $$;

do $$ begin
  create type image_kind as enum ('restaurant_profile','restaurant_banner','menu','promotion');
exception when duplicate_object then null; end $$;

-- Profiles (link to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  role user_role not null default 'user',
  display_name text,
  avatar_url text,
  phone text,
  -- preferences for consumer
  preferences jsonb,
  -- vendor fields
  vendor_verified boolean not null default false
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger profiles_set_updated
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- Restaurants
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  email text not null,
  phone text,
  address text not null,
  latitude double precision,
  longitude double precision,
  website text,
  cuisine_types text[] default '{}',
  price_range int check (price_range between 1 and 4),
  hours jsonb,
  subscription_status subscription_status not null default 'trial',
  subscription_expires_at timestamptz,
  qr_code_url text
);

create trigger restaurants_set_updated
before update on public.restaurants
for each row execute procedure public.set_updated_at();

-- Promotions
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  title text not null,
  description text not null,
  discount_type discount_type not null,
  discount_value numeric(10,2),
  category promotion_category not null,
  subcategory text,
  dietary_options text[] default '{}',
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_active boolean not null default true,
  max_redemptions int,
  current_redemptions int not null default 0,
  applicable_days int[]
);

create trigger promotions_set_updated
before update on public.promotions
for each row execute procedure public.set_updated_at();

-- Follows (users follow restaurants)
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  notification_enabled boolean not null default true,
  unique(user_id, restaurant_id)
);

-- Activity Feed (central hub, normalized events)
create table if not exists public.feed_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  promotion_id uuid references public.promotions(id) on delete set null,
  event_type text not null check (event_type in ('promotion_created','promotion_updated','promotion_activated','promotion_deactivated','announcement')),
  title text not null,
  body text,
  image_url text
);

-- Notifications log
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  promotion_id uuid references public.promotions(id) on delete set null,
  title text not null,
  message text not null,
  channel text not null check (channel in ('push','sms','email')),
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  sent_count int not null default 0
);

-- Images (Storage metadata references)
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_user_id uuid references auth.users(id) on delete set null,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  promotion_id uuid references public.promotions(id) on delete cascade,
  kind image_kind not null,
  bucket text not null default 'public',
  path text not null,
  width int,
  height int,
  alt text,
  sort_order int
);

-- Simple analytics (optional but useful)
create table if not exists public.promotion_views (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  source text
);

create table if not exists public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null
);

-- Storage buckets (run with service role or via SQL if permitted)
-- Note: If using Supabase Storage, create buckets via dashboard or storage API.
-- Recommended buckets: 'restaurant-images', 'promotion-images', 'menu-images'

-- RLS and Policies
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.promotions enable row level security;
alter table public.follows enable row level security;
alter table public.feed_events enable row level security;
alter table public.notifications enable row level security;
alter table public.images enable row level security;
alter table public.promotion_views enable row level security;
alter table public.promotion_redemptions enable row level security;

-- Profiles: user can read self and public fields, update self
create policy "profiles_select_self_or_public" on public.profiles
for select using (true);

create policy "profiles_update_self" on public.profiles
for update using (auth.uid() = id);

-- Restaurants: anyone can read; only owner can insert/update/delete
create policy "restaurants_select_all" on public.restaurants for select using (true);
create policy "restaurants_modify_owner" on public.restaurants
for all using (auth.role() = 'authenticated' and auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Promotions: select all; vendor owner of restaurant can modify
create policy "promotions_select_all" on public.promotions for select using (true);
create policy "promotions_modify_owner" on public.promotions
for all using (
  auth.role() = 'authenticated' and exists(
    select 1 from public.restaurants r where r.id = promotions.restaurant_id and r.owner_id = auth.uid()
  )
) with check (
  exists(select 1 from public.restaurants r where r.id = promotions.restaurant_id and r.owner_id = auth.uid())
);

-- Follows: users manage their rows
create policy "follows_read_own_and_public" on public.follows for select using (
  auth.role() = 'anon' or user_id = auth.uid()
);
create policy "follows_insert_self" on public.follows for insert with check (auth.uid() = user_id);
create policy "follows_delete_self" on public.follows for delete using (auth.uid() = user_id);

-- Feed events: public read; vendor can insert events for their restaurant
create policy "feed_select_all" on public.feed_events for select using (true);
create policy "feed_vendor_insert" on public.feed_events for insert with check (
  exists(select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
);

-- Notifications: restrict write to vendor; everyone can read their own? keep read restricted
create policy "notifications_vendor_insert" on public.notifications for insert with check (
  exists(select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
);
create policy "notifications_select_none" on public.notifications for select using (false);

-- Images: public read; vendor owner write
create policy "images_select_all" on public.images for select using (true);
create policy "images_vendor_modify" on public.images for all using (
  exists(select 1 from public.restaurants r where r.id = images.restaurant_id and r.owner_id = auth.uid())
) with check (
  exists(select 1 from public.restaurants r where r.id = images.restaurant_id and r.owner_id = auth.uid())
);

-- Views and redemptions: public insert (client event) and select own; tighten later via edge functions if needed
create policy "views_insert" on public.promotion_views for insert with check (true);
create policy "views_select_own_or_public" on public.promotion_views for select using (true);
create policy "redemptions_insert" on public.promotion_redemptions for insert with check (true);
create policy "redemptions_select_public" on public.promotion_redemptions for select using (true);

-- Helper views
create or replace view public.v_restaurant_stats as
select r.id as restaurant_id,
       count(distinct p.id) filter (where p.is_active and now() between p.start_time and p.end_time) as active_deals,
       count(distinct v.id) as total_views,
       count(distinct rd.id) as total_redemptions
from public.restaurants r
left join public.promotions p on p.restaurant_id = r.id
left join public.promotion_views v on v.promotion_id = p.id
left join public.promotion_redemptions rd on rd.promotion_id = p.id
group by r.id;
