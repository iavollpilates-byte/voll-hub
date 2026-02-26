# Todas as mensagens e regras do app (para o admin)

Este documento lista **todas** as mensagens, modais, banners e avisos que o usuário pode ver no app, em que momento aparecem e onde você pode editá-los no CMS.

---

## 1. Tela inicial (Landing / Cadastro)

| O quê | Regra de entrada | Onde editar no CMS |
|-------|------------------|--------------------|
| Nome da marca, subtítulo, texto principal, stats (Materiais, Grátis, 100%), labels e placeholders do formulário, botão CTA, texto de segurança | Sempre na tela de cadastro | **Admin → Textos → 🏠 Tela Inicial**: `brandName`, `brandTag`, `landingSubtitle`, `landingStat1Label`, `landingStat2`, `landingStat2Label`, `landingStat3`, `landingStat3Label`, `nameLabel`, `namePlaceholder`, `whatsLabel`, `whatsPlaceholder`, `ctaText`, `safeText` |

---

## 2. Hub (após login)

### 2.1 Header e saudação

| O quê | Regra | Onde editar |
|-------|--------|-------------|
| "Olá, [Nome]! 👋" e subtítulo (ex.: "VOLL Pilates Hub") | Sempre no hub | **Textos → 📱 Hub**: `hubGreetPrefix`, `hubGreetEmoji`, `hubSubtitle` |
| "Você tem X créditos" (tooltip ao clicar) | Sempre se créditos estão ativos | **Textos → Gamificação (Créditos)**: `creditsTooltipTitle` (use `{n}` para o número), `creditsTooltipDesc`, `creditsTooltipBtn` |

### 2.2 Banner "Novidade: foto no ranking"

| O quê | Regra de entrada | Onde editar |
|-------|------------------|-------------|
| "Novidade: adicione sua foto no Perfil e apareça no ranking." + Ver / Fechar | **Quando:** está no hub **e** o usuário **não tem** foto (`!userAvatarUrl`) **e** ainda **não dispensou** (localStorage `vollhub_photo_announce_seen`). Uma vez que o usuário clica em Fechar ou Ver, não aparece mais. | **Texto fixo no código** (VollHub.jsx). Não há chave no CMS hoje. |

### 2.3 Reflexão do dia

| O quê | Regra | Onde editar |
|-------|--------|-------------|
| Card "Reflexão do dia" com título, corpo, ação do dia, like/dislike, Story, WhatsApp | Sempre que existir reflexão com `publish_date` = hoje e `active` = true | Conteúdo em **Admin → Reflexões**. Títulos/textos não vêm do CMS de textos. |

### 2.4 Seção de materiais

| O quê | Regra | Onde editar |
|-------|--------|-------------|
| Título da seção (ex.: "Materiais disponíveis"), sufixo do progresso, dica | Sempre no hub | **Textos → 📱 Hub**: `sectionTitle`, `progressSuffix`, `progressHint` |

### 2.5 Alertas (CTAs) — no máximo 2 visíveis

A ordem de prioridade é: **Instalar app** → **Comentar no Instagram** → **Complete perfil**. Só aparecem até **2** ao mesmo tempo.

#### A) Instale o VOLL Hub na tela inicial

| O quê | Regra de entrada | Onde editar |
|-------|------------------|-------------|
| Banner "Instale o VOLL Hub na tela inicial — como um app" com passos (Safari/Chrome) e botões "Instalar agora", "Já instalei", "Agora não" / "Fechar" (✕) | **Quando:** mobile **e** não está instalado como PWA (`!isStandalone`) **e** usuário não dispensou de forma permanente (`vollhub_install_dismissed`) **e** não dispensou nesta sessão. | **Texto fixo no código.** Não há chave no CMS. O botão ✕ grava `vollhub_install_dismissed` no localStorage (não mostra mais). "Agora não" só esconde na sessão. |

#### B) Comente no Instagram e ganhe créditos

| O quê | Regra de entrada | Onde editar |
|-------|------------------|-------------|
| Card "Faça um comentário no post abaixo e receba +1 crédito grátis!" (ou texto configurável) + "Abrir Post e Comentar" / "Já comentei ✓" | **Quando:** créditos ativos **e** existe post do Instagram configurado no CMS (Quizzes / posts) **e** o usuário ainda não ganhou crédito por aquele post. Faz parte dos **visibleAlerts** (máx. 2). | Texto do card pode vir de **Modais** (commentModalTitle, commentModalDesc). Posts vêm de **Admin → Quizzes** (Instagram posts). |

#### C) Complete seu perfil (ganhe créditos)

| O quê | Regra de entrada | Onde editar |
|-------|------------------|-------------|
| Card "Ganhe créditos! X/Y fases" com barra de progresso e seta para o perfil | **Quando:** perfil está **incompleto** (`!userProfile.completed`). Faz parte dos **visibleAlerts** (máx. 2). | **Textos → 📱 Hub**: `profilePromptText`. **Textos → perfil (tela)**: `profileSectionTitle`. Fases em **Gamificação → Fases do Perfil**. |

### 2.6 Footer do hub

| O quê | Regra | Onde editar |
|-------|--------|-------------|
| Link do Instagram + link "Como funciona?" | Sempre no hub | Link: **Textos → 🔗 Links**: `instagramUrl`, `instagramHandle`. O texto "Como funciona?" é fixo; ao clicar abre o modal abaixo. |

---

## 3. Modal "Como funciona?"

| O quê | Regra de entrada | Onde editar |
|-------|------------------|-------------|
| Modal com 3 blocos: Materiais gratuitos, Créditos (X ao se cadastrar), Ganhe mais (perfil + indicar) | **Quando:** (1) **Primeira vez no hub:** na primeira entrada no hub é setado `vollhub_seen_hub_once` e o modal abre **uma vez** automaticamente. (2) **Sempre** que o usuário clicar em "Como funciona?" no footer. | **Conteúdo fixo no código** (VollHub.jsx). Usa apenas `config.creditsInitial` para o número de créditos iniciais. Não há títulos/parágrafos do modal no CMS. |

---

## 4. Modal "Ganhe Créditos" (loja de créditos)

| O quê | Regra de entrada | Onde editar |
|-------|------------------|-------------|
| Título "Ganhe Créditos", saldo "Você tem X créditos", lista de formas de ganhar (Fases 1–3, Comentar Instagram, Indicar amigo, Quiz, etc.) e botão Fechar | **Quando:** usuário clica no pill de créditos no header (e depois "Ganhar créditos" no tooltip) **ou** tenta baixar material que custa créditos sem ter saldo. | **Textos → Gamificação (Créditos)**: `creditsStoreTitle`, `creditsStorePhaseSubtitle`, `creditsStoreReferralTitle`, `creditsStoreReferralSubtitle`, `creditsStoreCloseBtn`. Valores em **Gamificação**: `creditsInitial`, `creditsReferral`, `creditsReferralMsg`, e fases (Fase 1–3) com ícones/títulos no bloco "Fases do Perfil". |

---

## 5. Popup "Cadastre seu e-mail e ganhe +2 créditos"

| O quê | Regra de entrada | Onde editar |
|-------|------------------|-------------|
| Modal "Informe agora o seu email e receba +2 créditos" com campo de e-mail, "Receber créditos" e "Agora não" | **Quando:** usuário está no **hub**, **logado** (tem WhatsApp), o **lead não tem e-mail** cadastrado **e** não dispensou nesta **sessão** (`sessionStorage`: `vollhub_email_popup_dismissed`). Ou seja: pode aparecer de novo em outra sessão se ainda não tiver e-mail. | **Texto fixo no código.** Não há chave no CMS para título ou botões deste popup. |

---

## 6. Onboarding (primeira vez após cadastro)

| O quê | Regra de entrada | Onde editar |
|-------|------------------|-------------|
| 3 telas: (1) Bem-vinda + materiais gratuitos, (2) Créditos (X ao se cadastrar), (3) Ganhe mais (perfil + indicar). Botão "Próximo" / "Começar" | **Quando:** usuário **acabou de se cadastrar** (novo lead) **e** ainda não viu o onboarding (`!localStorage.getItem("vollhub_onboarding_done")`). Após concluir, grava `vollhub_onboarding_done`. | **Texto fixo no código.** Usa `config.creditsInitial` para o número. Não há títulos/parágrafos no CMS. |

---

## 7. Outras mensagens (toasts / feedback rápido)

Estas são mensagens curtas que aparecem na parte de baixo da tela (toast):

- "Créditos insuficientes! 🎯" + abre modal Ganhe Créditos
- "Você precisa de X créditos para baixar. Ganhe créditos! 🎯"
- "Complete seu perfil para desbloquear! 📋"
- "+2 créditos! E-mail salvo ✅"
- "Mensagem enviada! Obrigado pelo retorno." (Suporte)
- Entre outras de sucesso/erro em download, perfil, quiz, etc.

A maioria é **fixa no código**; não há CMS para toasts.

---

## 8. Resumo: o que está no CMS hoje

- **Textos → Tela Inicial:** landing (marca, subtítulo, stats, formulário, CTA).
- **Textos → Hub:** saudação, progresso, seção materiais, texto do perfil (hub e tela).
- **Textos → Modais:** indicação (share), comentário Instagram (comment), pesquisa (survey).
- **Textos → Links:** Instagram, baseUrl, logo.
- **Textos → 📢 Mensagens e avisos:** todos os popups, modais e banners abaixo, com **regra de entrada** explicada e opção Ativo/Desativado:
  - Popup e-mail (+2 créditos): título, botões, toggle.
  - Modal "Como funciona?": título, link do footer, 3 passos (use `{n}` para créditos), abrir na 1ª vez no hub.
  - Onboarding (3 telas): títulos e descrições (use `{name}` e `{n}`), botões Próximo/Começar/Pular, toggle.
  - Banner "Instale na tela inicial": título, passos iOS/Android, botões Instalar/Já instalei/Agora não, toggle.
  - Banner "Foto no ranking": texto, botões Ver/Fechar, toggle.
- **Gamificação → Créditos:** créditos iniciais, por indicação, mensagem indicação, tooltip (título, descrição, botão), modal Ganhe Créditos (título, subtítulos, botão fechar).
- **Gamificação → Fases do Perfil:** títulos, ícones, créditos por fase, perguntas (e se profileEnabled está ativo).

---

## 9. O que **não** está no CMS (fixo no código)

- Toasts de erro/sucesso (mensagens curtas de feedback).

---

## 10. Regras de entrada em uma frase

| Mensagem / Aviso | Em uma frase |
|-------------------|--------------|
| Landing | Sempre na tela de cadastro. |
| Email popup | Hub + logado + lead sem e-mail + não dispensou nesta sessão. |
| Como funciona? (auto) | Primeira vez que entra no hub (uma vez); depois só ao clicar no link do footer. |
| Onboarding | Logo após cadastro, uma vez (flag no localStorage). |
| Banner instalar | Mobile, não PWA, não dispensou (localStorage ou sessão). |
| Banner foto ranking | Hub, sem foto, não dispensou (localStorage). |
| Alertas (Instalar / Instagram / Perfil) | Máximo 2 visíveis; ordem: Instalar → Instagram → Perfil. |
| Modal Ganhe Créditos | Ao clicar em créditos no header ou ao tentar baixar material sem saldo. |
| Suporte | Sempre que o usuário abrir Menu → Suporte. |

Tudo acima (exceto toasts) pode ser editado e ligado/desligado em **Admin → Textos → 📢 Mensagens e avisos**.
