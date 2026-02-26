# Sequência de melhorias – Hub do usuário

Ordem sugerida para as próximas melhorias de organização e UX do hub (VollHub).

---

## Já feito

1. **Reordenar blocos** – Reflexão primeiro; depois Materiais (com progresso no topo); depois Alertas; footer com "Como funciona?".
2. **Barra de progresso** – Dentro da seção de materiais (título → progresso → filtros → lista).
3. **"Como funciona?"** – Só no footer (link que abre modal); primeira visita abre o modal uma vez.
4. **Ajustes finos** – Footer em coluna, Escape fecha modal, animações só onde faz sentido.
5. **Máx. 2 CTAs visíveis** – Apenas até 2 blocos de ação (Instalar app, Comentar no Instagram, Complete perfil) por vez, por prioridade: Instalar > Instagram > Perfil.

---

## Próximas melhorias (sugestão de ordem)

1. **Um CTA por vez (opcional)**  
   Em vez de 2, mostrar só 1 alerta de ação por vez (Instalar, ou Instagram, ou Perfil). Quem quiser ver o outro pode ter um link "Ver mais ações" que expande ou abre um pequeno painel.

2. **Card "Complete perfil" mais compacto**  
   Depois que o usuário já viu uma vez, exibir uma linha com barra de progresso + link "Completar", em vez do card grande, para reduzir ruído.

3. **Responsividade do header**  
   Em telas muito estreitas, garantir que créditos e menu (⋯) permaneçam sempre visíveis (ex.: voltar dentro do menu se precisar).

4. **Agrupar alertas em "Ações"**  
   Um único bloco "Ações para ganhar créditos" com lista colapsável ou links para Instalar, Comentar, Perfil, em vez de vários cards separados.

5. **Novos materiais**  
   Manter como está (sempre visível quando houver novos); opcional: botão "Visto" que recolhe o card até a próxima visita.

---

## Foto de perfil (implementado)

- Upload de foto de rosto no **Perfil** (bloco "Sua foto"); aparece no **ranking** e no **header do hub**.
- **Supabase:** é preciso:
  1. Adicionar coluna na tabela `leads`: `avatar_url` (texto, nullable).
  2. Criar bucket de Storage **profile-photos** e deixá-lo **público** (para leitura das fotos no ranking).

Exemplo no SQL Editor do Supabase:

```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS avatar_url text;
```

Depois, em Storage: criar bucket `profile-photos`, política pública de leitura (e escrita/atualização apenas para o app, se quiser restringir).

---

## Como usar

- Implementar na ordem que fizer mais sentido para o produto.
- Cada item pode ser feito em um commit separado para facilitar deploy e rollback.
