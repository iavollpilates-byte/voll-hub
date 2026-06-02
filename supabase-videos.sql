-- ═══════════════════════════════════════════════
-- VOLL HUB — Videos (Pilates Gestão/Marketing/Vendas)
-- Cole tudo no SQL Editor do Supabase e clique RUN
-- ═══════════════════════════════════════════════

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- 1) VIDEOS (public read; admin write via service_role)
create table if not exists videos (
  id bigint generated always as identity primary key,
  slug text unique,
  title text not null,
  description text default '',
  category text default 'marketing' check (category in ('gestao', 'marketing', 'vendas')),
  youtube_url text not null,
  materials jsonb default '[]',
  cta jsonb default '{}'::jsonb,
  active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create index if not exists videos_active_sort_idx on videos (active, sort_order, created_at desc);

-- 2) VIDEO EVENTS (append-only tracking; user insert only; admin reads via service_role)
create table if not exists video_events (
  id uuid primary key default gen_random_uuid(),
  lead_id bigint not null references leads(id) on delete cascade,
  video_id bigint not null references videos(id) on delete cascade,
  event_type text not null check (event_type in ('play', 'mark_50')),
  created_at timestamptz default now()
);

create index if not exists video_events_video_type_created_idx on video_events (video_id, event_type, created_at desc);
create index if not exists video_events_lead_video_created_idx on video_events (lead_id, video_id, created_at desc);

-- 3) VIDEO QUESTIONS (user submits; admin triage/respond via service_role)
create table if not exists video_questions (
  id bigint generated always as identity primary key,
  lead_id bigint not null references leads(id) on delete cascade,
  video_id bigint not null references videos(id) on delete cascade,
  question text not null,
  context jsonb default '{}'::jsonb,
  status text default 'new' check (status in ('new', 'answered', 'content_idea')),
  answer_text text default '',
  created_at timestamptz default now(),
  answered_at timestamptz
);

create index if not exists video_questions_video_status_created_idx on video_questions (video_id, status, created_at desc);
create index if not exists video_questions_status_created_idx on video_questions (status, created_at desc);

-- 4) RLS
alter table videos enable row level security;
alter table video_events enable row level security;
alter table video_questions enable row level security;

-- VIDEOS: public read only (no insert/update/delete policies)
drop policy if exists "videos_select" on videos;
create policy "videos_select" on videos for select using (true);

-- VIDEO_EVENTS: allow inserts only (no selects/updates/deletes for anon)
drop policy if exists "video_events_insert" on video_events;
create policy "video_events_insert" on video_events for insert with check (true);

-- VIDEO_QUESTIONS: allow inserts only (no selects/updates/deletes for anon)
drop policy if exists "video_questions_insert" on video_questions;
create policy "video_questions_insert" on video_questions for insert with check (true);

-- ═══════════════════════════════════════════════
-- PRONTO! ✅
-- Admin lê e gerencia via service_role (/api/admin)
-- ═══════════════════════════════════════════════
