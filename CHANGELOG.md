# Histórico de versões

## 0.5.2 — 2026-10-12
- Fundo com padrão de pokébolas em tons de cinzento e uma pokébola grande esbatida (claro e escuro);
  cartões e campos ligeiramente translúcidos para manter a leitura.

## 0.5.1 — 2026-10-12
- Erros HTTP da API mostram uma mensagem curta (nunca HTML) e, se a Pokémon TCG API falhar (502/503/504),
  o set continua a preencher preços com a TCGdex a partir da cache.

## 0.5.0 — 2026-10-12
- Largura fluida até 1600 px (mais colunas de cartas em ecrãs grandes).
- Tema claro/escuro: botão Auto / Claro / Escuro (guarda a escolha, sem «flash» ao carregar).

## 0.4.1 — 2026-10-12
- Sets: ao abrir ou atualizar um set, os preços em falta da Pokémon TCG API são preenchidos em bloco com a TCGdex
  (antes só carta a carta). O set mostra quantas cartas continuam sem preço.

## 0.4.0 — 2026-10-12
- Recuperação de password: página «Conta» (alterar a própria password), reposição pelo administrador e
  «Esqueci-me da password» por email (requer SMTP no Supabase).

## 0.3.0 — 2026-10-12
- Registo só por convite: códigos gerados pelo administrador (usos máximos e validade), página `/register`,
  contas criadas já confirmadas (sem email/SMTP). Removido o registo público com confirmação por email.

## 0.2.0 — 2026-10-12
- Utilizadores: página de administração (`ADMIN_EMAILS`) para criar e apagar contas; registo público opcional
  (`NEXT_PUBLIC_ALLOW_SIGNUP`) com confirmação de email.

## 0.1.0 — 2026-10-10
- Primeira versão: login, coleção (agrupada por set/Pokémon), sets, pesquisa, wishlist, detalhe da carta com
  preços Cardmarket e histórico, Pokémon TCG API + TCGdex, cache em Supabase e cron diário de preços.
