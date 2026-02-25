-- Migração: colunas necessárias para popup de e-mail e sistema de créditos em leads
-- Execute no Supabase (SQL Editor) do projeto em produção se as colunas ainda não existirem.

alter table leads add column if not exists email text default '';
alter table leads add column if not exists credits integer default 3;
alter table leads add column if not exists credits_earned jsonb default '{}';
