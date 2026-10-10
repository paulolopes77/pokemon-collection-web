# Histórico de versões

## 0.11.1 — 2026-10-12
- Página da carta: «Atualizar preço» passou para o cartão «Preços Cardmarket» (canto superior direito, na linha do
  título); «Wishlist» passou para o cartão «Na coleção», logo a seguir ao «+», com uma barra vertical subtil.
- O bloco de texto chama-se «Carta» e já não mostra a marca de regulamento.

## 0.11.0 — 2026-10-12
- Página da carta: bloco «Texto da carta» (em inglês) com habilidades, ataques (energias coloridas, dano e texto),
  fraqueza, resistência, recuo e regras. O texto vem do catálogo estático e fica guardado na base de dados
  (**correr `supabase/migrations/0003_card_text.sql`**); as cartas já em cache carregam o texto na primeira visita.
- Mais espaço entre a imagem da carta e os botões Cardmarket/TCGplayer.

## 0.10.1 — 2026-10-12
- Removido o carrossel de imagens (e a procura de outros idiomas): a página da carta volta a ter uma só imagem,
  com sombra. Os botões Cardmarket e TCGplayer mantêm a sombra.

## 0.10.0 — 2026-10-12
- Página da carta: carrossel com outras imagens da mesma carta (a mesma carta noutros idiomas, via TCGdex:
  português, espanhol, francês, alemão, italiano, japonês, quando existirem). Telemóvel: deslizar com o dedo;
  PC: clicar na carta (ou setas do teclado / botões ‹ ›). Resultados em cache durante 24 h.
- Sombra também nos botões do Cardmarket e do TCGplayer.

## 0.9.0 — 2026-10-12
- Sets: filtros por série e por ano; campo de texto mais curto («Procurar por SET», continua a procurar também na
  série); cada set é um cartão com contorno e sombra, em grelha de 1 a 3 colunas.

## 0.8.0 — 2026-10-12
- Catálogo fiável: a lista de sets e as cartas de cada set vêm do repositório público PokemonTCG/pokemon-tcg-data
  (ficheiros estáticos, todas as cartas de uma vez). A Pokémon TCG API (que dá 500/502) passa a servir só para
  preços, sem insistir quando falha; a TCGdex preenche o que faltar. Os preços já guardados nunca se perdem.

## 0.7.1 — 2026-10-12
- Página da carta: sombra na imagem; botões Cardmarket e TCGplayer por baixo da imagem.

## 0.7.0 — 2026-10-12
- Sets e pesquisa: ícone de coração para adicionar/remover da wishlist (a par do «+»); quantidade e wishlist
  atualizam logo no ecrã.
- Cabeçalhos dos grupos com contorno para se distinguirem do fundo.
- A pokébola grande do fundo roda conforme se faz scroll (parada com «reduzir movimento»).

## 0.6.0 — 2026-10-12
- O valor da carta passa a ser a **média de 30 dias** do Cardmarket (se não existir: média de 7 dias, tendência,
  média de venda, reverse holo). O preço mais baixo («From») deixa de ser usado como valor.
- A página da carta indica em que se baseia o valor; o gráfico mostra a evolução da média de 30 dias.

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
