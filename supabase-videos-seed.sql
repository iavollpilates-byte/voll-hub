-- ═══════════════════════════════════════════════
-- VOLL HUB — Videos seed (example content)
-- Rode após `supabase-videos.sql`
-- ═══════════════════════════════════════════════

insert into videos (slug, title, description, category, youtube_url, materials, cta, active, sort_order)
values (
  'captar-clientes-instagram',
  'Como captar clientes no Pilates pelo Instagram',
  'Um passo a passo prático para atrair clientes certos usando perfil, conteúdo e DM. Assista e aplique hoje.',
  'marketing',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  '[
    {"title":"Checklist (bio + destaques + CTA)","url":"https://example.com/checklist.pdf"},
    {"title":"Roteiro de DM (mensagem inicial + follow-up)","url":"https://example.com/roteiro-dm.pdf"}
  ]'::jsonb,
  '{
    "label":"Quer ajuda para aplicar isso no seu estúdio? Posso te dizer 3 ajustes no seu Instagram.",
    "buttonText":"Quero uma avaliação →",
    "url":"https://wa.me/5500000000000?text=Quero%20uma%20avaliacao%20do%20meu%20Instagram%20para%20captar%20clientes%20no%20Pilates"
  }'::jsonb,
  true,
  1
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  youtube_url = excluded.youtube_url,
  materials = excluded.materials,
  cta = excluded.cta,
  active = excluded.active,
  sort_order = excluded.sort_order;

-- Dica: troque o youtube_url e os links dos materiais/CTA.

