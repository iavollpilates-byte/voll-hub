# Como configurar o login Admin (passo a passo)

Se ao digitar o PIN aparece **"Servidor indisponível"**, **"Não foi possível conectar"**, **"Erro no servidor (500)"** ou **"PIN incorreto"** (mesmo com o PIN certo), siga estes passos.

---

## Rodar o projeto em local (com login Admin funcionando)

Se você está usando **`npm run dev`** (Vite), o frontend abre em `http://localhost:5173` (ou 5174), mas as rotas **`/api/*`** (como login por PIN) **não existem** nesse servidor. Por isso o login pode dar sempre "PIN incorreto" ou erro de rede.

Para ter **frontend + API** rodando em local (e o PIN funcionar):

1. Instale o Vercel CLI (uma vez):  
   `npm i -g vercel`
2. Na pasta do projeto, crie um arquivo **`.env.local`** com as mesmas variáveis do Vercel (ex.: `ADMIN_PIN`, `ADMIN_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Não commite esse arquivo.
3. Rode:  
   **`vercel dev`**
4. Acesse o endereço que aparecer (ex.: `http://localhost:3000`). Aí o login com PIN usa a API local e as variáveis do `.env.local`.

Resumo: **`npm run dev`** = só frontend (PIN não funciona). **`vercel dev`** = frontend + API (PIN funciona com `.env.local`).

---

## Passo 1: Garantir que o código está atualizado

1. No seu computador, abra o terminal na pasta do projeto (`voll-hub`).
2. Rode:
   ```bash
   git pull origin main
   ```
3. Se você fez alterações locais, faça commit e push antes:
   ```bash
   git add .
   git commit -m "Atualizar"
   git push origin main
   ```
4. O Vercel faz deploy automático ao dar push. Espere 1–2 minutos e acesse de novo o site.

---

## Passo 2: Verificar se a pasta `api` está no projeto

1. Na raiz do projeto você deve ter uma pasta **`api`**.
2. Dentro dela devem existir pelo menos:
   - `verify-pin.js`
   - `admin.js`
   - `generate-reflection.js`
3. Se não tiver, o repositório está incompleto. Peça para alguém enviar a pasta `api` ou restaure do Git.

---

## Passo 3: Criar / conferir variáveis no Vercel

1. Acesse **[vercel.com](https://vercel.com)** e faça login.
2. Abra o projeto do **voll-hub** (ou o nome que você deu).
3. Clique em **Settings** (Configurações).
4. No menu da esquerda, clique em **Environment Variables**.
5. Cadastre **uma por uma** as variáveis abaixo. Em "Key" coloque o nome exato; em "Value" o valor. Marque **Production** e **Preview** se quiser usar em ambos.

| Nome (Key) | Onde achar o valor | Exemplo |
|------------|--------------------|--------|
| `ADMIN_PIN` | Você escolhe: 4 dígitos (ex.: 9512) | `9512` |
| `ADMIN_TOKEN` | Você inventa: uma senha longa (ex.: 20+ caracteres) | `minha-senha-secreta-token-123` |
| `ADMIN_MASTER_NAME` | Opcional: nome que aparece no painel | `Rafael` |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` (secret) | `eyJhbGciOi...` |
| `GEMINI_API_KEY` | Opcional. Usada só pelo gerador de reflexões no Admin. [Google AI Studio](https://aistudio.google.com/app/apikey) → criar/copiar API key | `AIza...` |

**Como achar no Supabase:**

1. Acesse [supabase.com](https://supabase.com) e abra seu projeto.
2. Ícone de **engrenagem** (Project Settings).
3. Menu **API**.
4. **Project URL** → copie e cole em `SUPABASE_URL`.
5. Em **Project API keys**, localize a chave **`service_role`** (não use a `anon`). Clique em "Reveal" e copie → cole em `SUPABASE_SERVICE_ROLE_KEY`.

**Como obter a chave Gemini (opcional):**

Se você quiser usar o **gerador de reflexões** no Admin (CMS → Reflexões → "Gerar reflexão"), crie uma API key em [Google AI Studio](https://aistudio.google.com/app/apikey), copie o valor e cadastre como `GEMINI_API_KEY` no Vercel. Sem essa variável, o botão de gerar reflexão retornará "GEMINI_API_KEY não configurada no servidor".

Depois de salvar todas, anote o **PIN** que você colocou em `ADMIN_PIN`; é esse que você vai usar na tela de login.

---

## Passo 4: Fazer redeploy no Vercel

As variáveis só valem para deploys feitos **depois** de salvá-las.

1. No Vercel, abra o projeto.
2. Aba **Deployments**.
3. No último deployment, clique nos **três pontinhos** (⋯).
4. Clique em **Redeploy**.
5. Marque **Use existing Build Cache** (pode deixar assim).
6. Confirme com **Redeploy**.
7. Espere terminar (status "Ready").

---

## Passo 5: Testar se a API responde

1. Abra uma nova aba do navegador.
2. Acesse o **mesmo domínio** do seu app, por exemplo:
   - `https://seu-projeto.vercel.app`
3. Abra o **Console** do navegador (F12 → aba Console) e cole este código (troque a URL se for diferente):

```javascript
fetch('https://SEU-DOMINIO.vercel.app/api/verify-pin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pin: '0000' })
}).then(r => r.json()).then(console.log).catch(console.error);
```

4. Troque `SEU-DOMINIO.vercel.app` pela URL real do seu site (ex.: `voll-hub.vercel.app`).
5. Troque `0000` pelo PIN que você colocou em `ADMIN_PIN` se quiser testar login; senão deixe qualquer PIN para ver a resposta.
6. Dê Enter.

**O que pode aparecer:**

- **`{ error: "PIN incorreto" }`** → API está no ar e variáveis carregadas. O problema era só o PIN; use o PIN correto na tela de login.
- **`{ error: "ADMIN_TOKEN não configurado..." }`** → Falta criar `ADMIN_TOKEN` no Vercel (Passo 3).
- **`{ error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados..." }`** → Falta uma das duas no Vercel (Passo 3).
- **Erro de rede / falha no fetch** → A rota `/api/verify-pin` não existe nesse domínio. Confira se a pasta `api` está no repo e se fez redeploy (Passos 1, 2 e 4).

---

## Passo 6: Testar o login no site

1. Acesse seu site (ex.: `https://seu-projeto.vercel.app`).
2. Toque 5 vezes no logo para abrir a tela de login admin.
3. Digite o **PIN de 4 dígitos** que você definiu em `ADMIN_PIN`.
4. Clique em **Entrar**.

Se ainda der erro, anote **a mensagem exata** que aparece (e, se puder, o que apareceu no teste do Passo 5) e use isso para checar de novo os passos 2, 3 e 4.

---

## Resumo rápido

1. `git pull` e push (e aguardar deploy).
2. Ter pasta `api` com `verify-pin.js`.
3. No Vercel: Settings → Environment Variables → criar `ADMIN_PIN`, `ADMIN_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Deployments → Redeploy.
5. Testar a API no console (Passo 5).
6. Testar o login no site com o PIN definido em `ADMIN_PIN`.
