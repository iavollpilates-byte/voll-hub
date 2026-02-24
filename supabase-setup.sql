-- ═══════════════════════════════════════════════
-- VOLL HUB — Supabase Setup
-- Cole tudo no SQL Editor e clique RUN
-- ═══════════════════════════════════════════════

-- 1. MATERIAIS
create table if not exists materials (
  id bigint generated always as identity primary key,
  title text not null,
  description text default '',
  category text default '',
  icon text default '📄',
  date text default '',
  active boolean default true,
  unlock_type text default 'free' check (unlock_type in ('free', 'data', 'social', 'survey')),
  social_method text check (social_method in ('share', 'comment', null)),
  survey_questions jsonb default '[]',
  download_url text default '',
  expires_at bigint,
  limit_qty integer,
  limit_used integer default 0,
  is_flash boolean default false,
  flash_until bigint,
  preview_bullets jsonb default '[]',
  preview_images jsonb default '[]',
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- 2. LEADS
create table if not exists leads (
  id bigint generated always as identity primary key,
  name text not null,
  whatsapp text not null,
  downloads integer[] default '{}',
  visits integer default 1,
  first_visit text default '',
  last_visit text default '',
  source text default 'direct',
  city text default '',
  role text default '',
  studio_name text default '',
  students_count text default '',
  goals text default '',
  survey_responses jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. ADMIN USERS
create table if not exists admin_users (
  id bigint generated always as identity primary key,
  name text not null,
  pin text not null unique,
  role text default 'admin' check (role in ('master', 'admin')),
  permissions jsonb default '{"materials_view":true,"materials_edit":false,"leads_view":true,"leads_export":false,"leads_whatsapp":false,"textos_edit":false,"users_manage":false}',
  created_at timestamptz default now()
);

-- 4. CONFIGURAÇÕES (key-value)
create table if not exists config (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- ═══════════════════════════════════════════════
-- INSERIR MASTER USER
-- ═══════════════════════════════════════════════
insert into admin_users (name, pin, role, permissions) values (
  'MASTER PICA', '9512', 'master',
  '{"materials_view":true,"materials_edit":true,"leads_view":true,"leads_export":true,"leads_whatsapp":true,"textos_edit":true,"users_manage":true}'
);

-- ═══════════════════════════════════════════════
-- CONFIGURAÇÕES PADRÃO
-- ═══════════════════════════════════════════════
insert into config (key, value) values
  ('landingTitle', 'Materiais Exclusivos'),
  ('landingSubtitle', 'Templates, guias e ferramentas para Pilates'),
  ('landingCta', 'Acessar materiais'),
  ('landingFooter', 'VOLL Pilates Group'),
  ('hubGreetPrefix', 'Olá,'),
  ('hubGreetEmoji', '👋'),
  ('hubSubtitle', 'VOLL Pilates Hub'),
  ('progressSuffix', 'materiais acessados'),
  ('progressHint', 'Baixe todos e transforme seu studio!'),
  ('sectionTitle', 'Seus materiais'),
  ('shareModalTitle', 'Indique e desbloqueie!'),
  ('shareModalDesc', 'Compartilhe com um amigo para liberar este material.'),
  ('commentModalTitle', 'Comente e desbloqueie!'),
  ('commentModalDesc', 'Deixe um comentário no nosso último post para liberar.'),
  ('surveyModalTitle', 'Pesquisa Rápida'),
  ('instagramHandle', '@vollpilatesgroup'),
  ('instagramUrl', 'https://instagram.com/vollpilatesgroup'),
  ('baseUrl', 'https://vollhub.vercel.app'),
  ('bannerPersonalized', 'true'),
  ('socialProofMode', 'off'),
  ('socialProofBoost', '0'),
  ('socialProofNames', 'Maria,João,Ana,Carla,Pedro'),
  ('socialProofMinutes', '3,12,25,47,65')
on conflict (key) do nothing;

-- ═══════════════════════════════════════════════
-- RLS (Row Level Security) — DESABILITAR POR ORA
-- Em produção futura, habilitar com policies
-- ═══════════════════════════════════════════════
alter table materials enable row level security;
alter table leads enable row level security;
alter table admin_users enable row level security;
alter table config enable row level security;

-- Policies: permitir tudo via anon key (simplificado)
create policy "public_materials" on materials for all using (true) with check (true);
create policy "public_leads" on leads for all using (true) with check (true);
create policy "public_admin_users" on admin_users for all using (true) with check (true);
create policy "public_config" on config for all using (true) with check (true);

-- ═══════════════════════════════════════════════
-- STORAGE: Bucket para imagens de reflexão
-- ═══════════════════════════════════════════════
insert into storage.buckets (id, name, public) values ('reflection-images', 'reflection-images', true)
on conflict (id) do nothing;

create policy "public_read_reflection_images" on storage.objects for select using (bucket_id = 'reflection-images');
create policy "public_insert_reflection_images" on storage.objects for insert with check (bucket_id = 'reflection-images');
create policy "public_update_reflection_images" on storage.objects for update using (bucket_id = 'reflection-images');

-- ═══════════════════════════════════════════════
-- PRONTO! ✅ Agora configure o app com suas credenciais
-- ═══════════════════════════════════════════════
