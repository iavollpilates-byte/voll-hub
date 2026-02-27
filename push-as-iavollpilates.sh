#!/bin/sh
# Push para iavollpilates-byte/voll-hub usando token da conta iavollpilates-byte.
# Uso:
#   1. Crie um token: https://github.com/settings/tokens (conta iavollpilates-byte)
#      → Generate new token (classic) → marque "repo" → Generate.
#   2. Rode: GITHUB_TOKEN=seu_token_aqui ./push-as-iavollpilates.sh
#   Ou exporte antes: export GITHUB_TOKEN=seu_token && ./push-as-iavollpilates.sh
set -e
cd "$(dirname "$0")"
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Erro: defina GITHUB_TOKEN com o token da conta iavollpilates-byte."
  echo "Exemplo: GITHUB_TOKEN=ghp_xxxx ./push-as-iavollpilates.sh"
  exit 1
fi
git push "https://iavollpilates-byte:${GITHUB_TOKEN}@github.com/iavollpilates-byte/voll-hub.git" main
echo "Push concluído. Deploy deve rodar no GitHub Actions / Vercel (se configurado)."
