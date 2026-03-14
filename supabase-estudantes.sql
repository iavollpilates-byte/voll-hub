-- ═══════════════════════════════════════════════
-- ÁREA ESTUDANTES + DIAGNÓSTICO DE CARREIRA
-- Cole no SQL Editor do Supabase e execute
-- ═══════════════════════════════════════════════

-- 1. ESTUDANTES (cadastro simples: nome, email, telefone)
create table if not exists estudantes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. TOKENS (magic link para acesso)
create table if not exists estudante_tokens (
  id uuid primary key default gen_random_uuid(),
  estudante_id uuid not null references estudantes(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
create index if not exists idx_estudante_tokens_token on estudante_tokens(token);
create index if not exists idx_estudante_tokens_estudante_id on estudante_tokens(estudante_id);

-- 3. DOCUMENTOS (PDFs, checklists para download)
create table if not exists estudante_documents (
  id bigint generated always as identity primary key,
  title text not null,
  description text default '',
  file_url text not null default '',
  sort_order integer default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- 3b. LINKS (eventos, divulgações para alunos)
create table if not exists estudante_links (
  id bigint generated always as identity primary key,
  title text not null,
  description text default '',
  url text not null default '',
  sort_order integer default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- 4. PERGUNTAS DO DIAGNÓSTICO (editáveis no admin)
create table if not exists diagnostico_questions (
  id bigint generated always as identity primary key,
  question_number integer not null check (question_number >= 1 and question_number <= 10),
  question_text text not null,
  options jsonb not null default '[]',
  dimension text not null check (dimension in ('Presença Digital', 'Posicionamento', 'Networking', 'Comunicação', 'Mentalidade')),
  created_at timestamptz default now()
);

-- 5. RESULTADOS DO DIAGNÓSTICO (histórico por estudante)
create table if not exists diagnostico_results (
  id uuid primary key default gen_random_uuid(),
  estudante_id uuid not null references estudantes(id) on delete cascade,
  created_at timestamptz default now(),
  responses jsonb not null default '[]',
  total_score integer not null,
  level text not null,
  dimension_scores jsonb not null default '{}',
  recommendations jsonb not null default '[]'
);
create index if not exists idx_diagnostico_results_estudante on diagnostico_results(estudante_id);

-- ═══════════════════════════════════════════════
-- SEED: 10 PERGUNTAS DO DIAGNÓSTICO (PDF)
-- ═══════════════════════════════════════════════
do $$
begin
  if (select count(*) from diagnostico_questions) = 0 then
    insert into diagnostico_questions (question_number, question_text, options, dimension) values
    (1, 'Hoje, se um paciente pesquisar seu nome no Google ou no Instagram, o que ele vai encontrar?', '[{"text":"Nada. Meu perfil é pessoal, sem nenhum conteúdo profissional.","points":0},{"text":"Tem algo, mas está desatualizado e misturado com coisas pessoais.","points":3},{"text":"Tenho um perfil com bio profissional, mas quase sem conteúdo.","points":6},{"text":"Tenho perfil profissional ativo, com bio clara e conteúdo periódico sobre minha área.","points":10}]', 'Presença Digital'),
    (2, 'Se alguém te perguntar agora ''o que você faz, pra quem e qual seu diferencial?'', você saberia responder em 30 segundos?', '[{"text":"Não. Eu diria só ''sou fisioterapeuta''.","points":0},{"text":"Mais ou menos. Consigo falar o que faço, mas sem muita clareza.","points":3},{"text":"Sim, consigo explicar o que faço e pra quem, mas não sei bem meu diferencial.","points":6},{"text":"Sim. Tenho isso muito claro e consigo comunicar com segurança.","points":10}]', 'Posicionamento'),
    (3, 'Quantos profissionais da área da saúde você conhece pessoalmente e com quem mantém algum contato?', '[{"text":"Nenhum ou quase nenhum além dos colegas de turma.","points":0},{"text":"De 1 a 5 profissionais.","points":3},{"text":"De 6 a 15 profissionais.","points":6},{"text":"Mais de 15, incluindo profissionais de diferentes áreas.","points":10}]', 'Networking'),
    (4, 'Nos últimos 30 dias, você publicou algum conteúdo profissional relacionado à fisioterapia?', '[{"text":"Não publiquei nada.","points":0},{"text":"Publiquei 1 ou 2 coisas, sem muita estratégia.","points":3},{"text":"Publiquei entre 3 e 6 conteúdos com alguma intenção profissional.","points":7},{"text":"Publiquei mais de 6 conteúdos com consistência e foco na minha área.","points":10}]', 'Presença Digital'),
    (5, 'Como você avalia sua capacidade de explicar um conceito técnico de forma simples para um paciente leigo?', '[{"text":"Tenho muita dificuldade. Fico inseguro e confuso.","points":0},{"text":"Consigo, mas não me sinto confiante.","points":3},{"text":"Me comunico razoavelmente bem, mas sei que posso melhorar.","points":6},{"text":"Tenho facilidade em explicar, as pessoas entendem e confiam no que eu digo.","points":10}]', 'Comunicação'),
    (6, 'Você já parou para pensar em como vai ganhar dinheiro com fisioterapia depois de formado?', '[{"text":"Não. Vou ver o que aparece.","points":0},{"text":"Penso vagamente nisso, mas não tenho nada concreto.","points":3},{"text":"Tenho algumas ideias, mas ainda não estruturei nada.","points":6},{"text":"Sim. Já tenho um modelo em mente, com público, serviço e faixa de preço definidos.","points":10}]', 'Posicionamento'),
    (7, 'Nos últimos 6 meses, você estudou oratória, marketing, vendas, gestão, finanças ou liderança?', '[{"text":"Não. Só estudo conteúdo técnico da faculdade.","points":0},{"text":"Assisti a um ou dois vídeos sobre algum desses temas.","points":3},{"text":"Li um livro ou fiz um curso curto sobre alguma dessas áreas.","points":7},{"text":"Estudo ativamente pelo menos uma dessas áreas com frequência.","points":10}]', 'Mentalidade'),
    (8, 'Nos últimos 12 meses, você participou de congresso, workshop, palestra ou evento da área?', '[{"text":"Nenhum.","points":0},{"text":"Participei de 1 evento online.","points":3},{"text":"Participei de 2 a 3 eventos (online ou presencial).","points":6},{"text":"Participei de 4 ou mais eventos, incluindo pelo menos 1 presencial.","points":10}]', 'Networking'),
    (9, 'Como você se sente em relação a cobrar pelo seu trabalho e apresentar seus serviços?', '[{"text":"Tenho muito desconforto. Acho que saúde não combina com dinheiro.","points":0},{"text":"Sei que preciso cobrar, mas me sinto constrangido.","points":3},{"text":"Consigo cobrar, mas ainda não sei comunicar bem o valor do meu trabalho.","points":6},{"text":"Me sinto confortável. Sei que cobrar bem é consequência de entregar bem.","points":10}]', 'Comunicação'),
    (10, 'Qual frase mais representa você hoje?', '[{"text":"Estou esperando me formar pra começar a pensar nisso.","points":0},{"text":"Sei que preciso fazer algo, mas não sei por onde começar.","points":3},{"text":"Já comecei a me movimentar, mas de forma inconsistente.","points":6},{"text":"Estou agindo ativamente para construir minha carreira além da técnica.","points":10}]', 'Mentalidade');
  end if;
end $$;

-- ═══════════════════════════════════════════════
-- CONFIG (CTA do diagnóstico)
-- ═══════════════════════════════════════════════
insert into config (key, value) values ('diagnosticoCtaUrl', ''), ('diagnosticoCtaText', 'Quero meu plano de ação')
on conflict (key) do nothing;

-- ═══════════════════════════════════════════════
-- STORAGE: bucket para documentos estudante
-- ═══════════════════════════════════════════════
insert into storage.buckets (id, name, public) values ('estudante-documents', 'estudante-documents', true)
on conflict (id) do nothing;

drop policy if exists "public_read_estudante_documents" on storage.objects;
create policy "public_read_estudante_documents" on storage.objects for select using (bucket_id = 'estudante-documents');
drop policy if exists "public_insert_estudante_documents" on storage.objects;
create policy "public_insert_estudante_documents" on storage.objects for insert with check (bucket_id = 'estudante-documents');
drop policy if exists "public_update_estudante_documents" on storage.objects;
create policy "public_update_estudante_documents" on storage.objects for update using (bucket_id = 'estudante-documents');

-- ═══════════════════════════════════════════════
-- RLS (permissivo como no restante do projeto)
-- ═══════════════════════════════════════════════
alter table estudantes enable row level security;
alter table estudante_tokens enable row level security;
alter table estudante_documents enable row level security;
alter table estudante_links enable row level security;
alter table diagnostico_questions enable row level security;
alter table diagnostico_results enable row level security;

drop policy if exists "public_estudantes" on estudantes;
create policy "public_estudantes" on estudantes for all using (true) with check (true);
drop policy if exists "public_estudante_tokens" on estudante_tokens;
create policy "public_estudante_tokens" on estudante_tokens for all using (true) with check (true);
drop policy if exists "public_estudante_documents" on estudante_documents;
create policy "public_estudante_documents" on estudante_documents for all using (true) with check (true);
drop policy if exists "public_estudante_links" on estudante_links;
create policy "public_estudante_links" on estudante_links for all using (true) with check (true);
drop policy if exists "public_diagnostico_questions" on diagnostico_questions;
create policy "public_diagnostico_questions" on diagnostico_questions for all using (true) with check (true);
drop policy if exists "public_diagnostico_results" on diagnostico_results;
create policy "public_diagnostico_results" on diagnostico_results for all using (true) with check (true);

-- ═══════════════════════════════════════════════
-- PERMISSÕES ADMIN: adicionar estudantes/diagnostico
-- (opcional: atualizar manualmente no Supabase ou via app)
-- ═══════════════════════════════════════════════
-- update admin_users set permissions = permissions || '{"estudantes_view":true,"estudantes_edit":true,"diagnostico_edit":true}'::jsonb where role = 'master';
