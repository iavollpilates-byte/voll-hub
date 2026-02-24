-- ═══════════════════════════════════════════════
-- VOLL HUB — RLS Security Update
-- Cole tudo no SQL Editor do Supabase e clique RUN
-- ═══════════════════════════════════════════════

-- 1. REMOVER POLÍTICAS ANTIGAS (permissivas demais)
drop policy if exists "public_materials" on materials;
drop policy if exists "public_leads" on leads;
drop policy if exists "public_admin_users" on admin_users;
drop policy if exists "public_config" on config;
drop policy if exists "public_phases" on phases;

-- 2. MATERIALS — anon pode ler e atualizar (para unlock), mas não criar/deletar
create policy "materials_select" on materials for select using (true);
create policy "materials_update" on materials for update using (true) with check (true);

-- 3. LEADS — acesso total para anon (usuários gerenciam seus próprios dados)
create policy "leads_all" on leads for all using (true) with check (true);

-- 4. ADMIN_USERS — sem acesso via anon key (gerenciado via API com service_role)
-- Nenhuma policy = nenhum acesso via anon key

-- 5. CONFIG — anon pode ler e fazer upsert (para pageViews)
create policy "config_select" on config for select using (true);
create policy "config_insert" on config for insert with check (true);
create policy "config_update" on config for update using (true) with check (true);

-- 6. PHASES — somente leitura para anon
create policy "phases_select" on phases for select using (true);

-- 7. REFLECTIONS — anon pode ler e atualizar (para likes/dislikes)
create policy "reflections_select" on reflections for select using (true);
create policy "reflections_update" on reflections for update using (true) with check (true);

-- ═══════════════════════════════════════════════
-- PRONTO! ✅
-- Agora as tabelas admin estão protegidas.
-- Operações de escrita admin vão pelo API proxy (/api/admin)
-- que usa a service_role key do servidor.
-- ═══════════════════════════════════════════════
