-- Migração: colunas necessárias para Instagram stats, créditos e funil na tabela materials
-- Execute no Supabase (SQL Editor) do projeto em produção se as colunas ainda não existirem.

ALTER TABLE materials ADD COLUMN IF NOT EXISTS insta_post_url text DEFAULT '';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS insta_views integer DEFAULT 0;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS insta_likes integer DEFAULT 0;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS insta_comments integer DEFAULT 0;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS insta_saves integer DEFAULT 0;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS credit_cost integer DEFAULT 1;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS funnel jsonb DEFAULT null;
