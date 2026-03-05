-- ═══════════════════════════════════════════════
-- GERADOR DE CONTRATOS — Supabase
-- Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════

-- 1. USUÁRIOS (donos de estúdio)
create table if not exists contratos_users (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null unique,
  cpf text default '',
  whatsapp text default '',
  password_hash text not null,
  created_at timestamptz default now()
);

-- 2. DADOS DO ESTÚDIO (1 por usuário)
create table if not exists contratos_studios (
  id bigint generated always as identity primary key,
  user_id bigint not null references contratos_users(id) on delete cascade,
  razao_social text default '',
  nome_fantasia text default '',
  endereco text default '',
  cnpj text default '',
  telefone text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- 3. ALUNOS
create table if not exists contratos_students (
  id bigint generated always as identity primary key,
  user_id bigint not null references contratos_users(id) on delete cascade,
  nome text not null,
  cpf text default '',
  email text default '',
  telefone text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. SUPER-ADMIN (PIN 9512)
create table if not exists contratos_admin (
  id bigint generated always as identity primary key,
  email text default '',
  pin text not null
);
insert into contratos_admin (email, pin)
select 'admin@contratos', '9512'
where not exists (select 1 from contratos_admin limit 1);

-- 5. OPCIONAL: contratos gerados (referência a PDFs)
create table if not exists contratos_generated (
  id bigint generated always as identity primary key,
  user_id bigint not null references contratos_users(id) on delete cascade,
  student_id bigint references contratos_students(id) on delete set null,
  file_path text default '',
  created_at timestamptz default now()
);

-- RLS: contratos_users — API usa service_role
alter table contratos_users enable row level security;
create policy "contratos_users_no_direct" on contratos_users for all using (false) with check (false);

alter table contratos_studios enable row level security;
create policy "contratos_studios_no_direct" on contratos_studios for all using (false) with check (false);

alter table contratos_students enable row level security;
create policy "contratos_students_no_direct" on contratos_students for all using (false) with check (false);

alter table contratos_admin enable row level security;
create policy "contratos_admin_no_direct" on contratos_admin for all using (false) with check (false);

alter table contratos_generated enable row level security;
create policy "contratos_generated_no_direct" on contratos_generated for all using (false) with check (false);

-- Índices
create index if not exists idx_contratos_studios_user_id on contratos_studios(user_id);
create index if not exists idx_contratos_students_user_id on contratos_students(user_id);
create index if not exists idx_contratos_users_email on contratos_users(email);
