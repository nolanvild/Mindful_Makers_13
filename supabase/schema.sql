-- Mindful Makers 13 — Plant Logbook schema
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- It is idempotent: safe to run more than once.

-- ---------------------------------------------------------------------------
-- plants table
-- ---------------------------------------------------------------------------
create table if not exists public.plants (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name            text not null,
  scientific_name text,
  collections     text[] not null default '{}',  -- a plant can belong to several, e.g. {Boston,Roses}
  about           text,
  care            text,
  tags            jsonb not null default '[]'::jsonb,  -- [{ "label": "Rose", "tone": "pink" }, ...]
  photo_path      text,                        -- storage object path within the bucket
  photo_url       text,                        -- public URL convenience copy
  confidence      text,                        -- AI confidence: "high" | "medium" | "low"
  created_at      timestamptz not null default now()
);

-- If an older version of this table already exists, add the collections column.
alter table public.plants
  add column if not exists collections text[] not null default '{}';

create index if not exists plants_user_id_created_at_idx
  on public.plants (user_id, created_at desc);

-- GIN index for "collections contains X" queries (the location/places screens).
create index if not exists plants_collections_gin_idx
  on public.plants using gin (collections);

-- ---------------------------------------------------------------------------
-- Row Level Security: each user only ever sees / writes their own plants
-- ---------------------------------------------------------------------------
alter table public.plants enable row level security;

drop policy if exists "plants_select_own" on public.plants;
create policy "plants_select_own" on public.plants
  for select using (auth.uid() = user_id);

drop policy if exists "plants_insert_own" on public.plants;
create policy "plants_insert_own" on public.plants
  for insert with check (auth.uid() = user_id);

drop policy if exists "plants_update_own" on public.plants;
create policy "plants_update_own" on public.plants
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "plants_delete_own" on public.plants;
create policy "plants_delete_own" on public.plants
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for plant photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

-- Public read of photos (bucket is public; this makes the policy explicit).
drop policy if exists "plant_photos_public_read" on storage.objects;
create policy "plant_photos_public_read" on storage.objects
  for select using (bucket_id = 'plant-photos');

-- Authenticated users may upload only into their own folder: <user_id>/<file>
drop policy if exists "plant_photos_insert_own" on storage.objects;
create policy "plant_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "plant_photos_delete_own" on storage.objects;
create policy "plant_photos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
