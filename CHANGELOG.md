# Histórico de versões

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
