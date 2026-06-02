# Área de Vídeos + CMS (Pilates)

## O que foi implementado
- **Aulas dentro do Hub**: aba **“Aulas”** (🎥) com lista por categoria e tela de detalhe com YouTube embed.
- **Tracking simples**:
  - **assistiu** = deu play (detectado pelo YouTube IFrame API)
  - **assistiu tudo** = clicou em **“Marcar 50%+”** (liberado após play)
- **Perguntas**: form no detalhe do vídeo salva a dúvida do lead.
- **Admin**: nova seção **“Aulas”** com:
  - CRUD de vídeos
  - Progresso (plays e marcações 50%+)
  - Perguntas (triagem + resposta/status)

## Banco de dados (Supabase)
Rode o script:
- `supabase-videos.sql`

Ele cria:
- `videos` (public read)
- `video_events` (insert-only)
- `video_questions` (insert-only)

### Políticas (RLS) escolhidas
Este MVP segue um modelo **híbrido** (compatível com o projeto atual, que identifica usuários por WhatsApp em `leads` e usa o client anon):

- **`videos`**: `select` liberado (qualquer usuário logado no app consegue carregar a lista).
- **`video_events`**: **somente `insert`** liberado (o app consegue registrar `play` e `mark_50`, mas não consegue ler eventos).
- **`video_questions`**: **somente `insert`** liberado (o app consegue enviar pergunta, mas não consegue listar perguntas).
- **Admin lê/edita** via `service_role` no endpoint `/api/admin` (evita expor eventos/perguntas para qualquer pessoa com a anon key).

## Trade-offs (por que assim)
- **Pró**: mantém simples e segura para o nível atual do projeto (sem Supabase Auth), e evita que a anon key permita ler o tracking de todo mundo.
- **Contra**: o usuário final não consegue “ver seu próprio progresso” lendo do banco (por isso usamos `localStorage` para refletir o estado de play/50%+ na UI).

## Admin API
Foi estendido:
- `api/admin.js`
  - adicionadas tabelas permitidas: `videos`, `video_events`, `video_questions`
  - adicionada ação `select` para listar dados do CMS com filtros/ordenação/paginação

## Onde fica no código
- Hub/UI:
  - `src/VollHub.jsx` (aba “Aulas” + detalhe)
  - `src/components/videos/VideosList.jsx`
  - `src/components/videos/VideoDetail.jsx`
  - `src/components/videos/youtube.js`
- Supabase/data:
  - `src/useSupabase.js` (funções: `trackVideoEvent`, `submitVideoQuestion`, `addVideo/updateVideo/deleteVideo`, `adminSelect/adminUpdate`)
- Admin:
  - `src/components/AdminPanel.jsx` (nova seção “Aulas”)
  - `src/components/admin/AdminVideos.jsx`
  - `src/components/admin/AdminVideoProgress.jsx`
  - `src/components/admin/AdminVideoQuestions.jsx`

## Próximos passos (opcionais)
- Trocar `localStorage` por “meu progresso” real no banco quando houver um modelo de identidade confiável (ex.: Supabase Auth).
- Melhorar relatório “quem não deu play” com segmentação por período e/ou snapshot diário.
