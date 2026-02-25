# Deploy (rafael.grupovoll.com.br)

O site em produção usa o projeto Vercel que responde em **voll-hub.vercel-yyki.app** e tem o domínio **rafael.grupovoll.com.br**. Esse projeto tem as variáveis de ambiente corretas (Supabase, APIs). Nunca apontar o domínio para o outro projeto (voll-hub.vercel.app), senão criação e acesso de usuários quebram.

Para atualizar o site em produção, o código novo precisa ser publicado **nesse mesmo projeto** (yyki).

---

## Opção 1 – Git conectado ao projeto yyki (recomendado)

Todo **push na branch escolhida** atualiza esse projeto e o site em rafael.grupovoll.com.br.

1. No dashboard da Vercel, abra o **projeto** que tem o alias **voll-hub.vercel-yyki.app** (e o domínio rafael.grupovoll.com.br). Pode estar em um time (ex.: yyki).
2. **Settings → Git**. Se já houver outro repositório conectado, desconecte.
3. **Connect Git Repository** e escolha o repositório do voll-hub (o mesmo que você usa no computador).
4. Selecione a branch (ex.: `main`) e confirme. A Vercel fará um deploy automático.
5. Depois disso, cada push nessa branch atualiza o site em produção, sem trocar domínio e sem quebrar usuários.

---

## Opção 2 – Deploy manual pelo terminal

Fazer deploy do código local **no projeto que já tem o domínio** (yyki).

1. No dashboard da Vercel, abra o projeto que tem **voll-hub.vercel-yyki.app** e anote o **time** (se for de um time) e o **nome do projeto**.
2. Na pasta do projeto:
   ```bash
   cd /Users/rafaeljuliano/Downloads/hubrafael/voll-hub
   vercel link
   ```
   Quando perguntar, escolha o **time** correto (yyki) e o **projeto** que está com o domínio (ex.: voll-hub). Isso gera `.vercel/project.json` e associa esta pasta a esse projeto.
3. Depois, para publicar em produção:
   ```bash
   npm run build
   vercel --prod
   ```
   O deploy vai para o projeto yyki; voll-hub.vercel-yyki.app e rafael.grupovoll.com.br passam a servir o código novo.

---

## GitHub Actions (deploy automático por push)

Se quiser que cada push na `main` dispare o deploy pela API da Vercel, use o workflow em [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

**Importante:** os secrets devem ser do **projeto que tem o domínio** (voll-hub.vercel-yyki.app), não do outro.

1. No repositório: **Settings → Secrets and variables → Actions → New repository secret.**
2. Crie:
   - `VERCEL_TOKEN` — [Vercel](https://vercel.com/account/tokens) → Create Token
   - `VERCEL_ORG_ID` — do projeto yyki (Settings → General, ou `.vercel/project.json` após `vercel link` no projeto correto)
   - `VERCEL_PROJECT_ID` — do mesmo projeto yyki
3. Domínio: no projeto na Vercel, **Settings → Domains** → rafael.grupovoll.com.br com DNS (CNAME) configurado.

Com isso, push em `main` atualiza o projeto correto e o site em produção.
