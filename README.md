# Coleção Pokémon (web)

Site para gerir uma coleção de cartas Pokémon, com preços do mercado europeu (Cardmarket, EUR).
Alternativa web à app Android [`pokemon-collection-android`](https://github.com/paulolopes77/pokemon-collection-android).

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth) · Vercel.

## Funcionalidades

- **Coleção** – cartas que tens, totais (n.º de cartas e valor), filtro, ordenação e **agrupamento por set ou por Pokémon** (grupos recolhíveis).
- **Sets** – todos os sets com progresso; dentro de um set vês as cartas (as que faltam esbatidas) e adicionas com `+`.
- **Pesquisar** – por nome. **Wishlist** – cartas que queres e custo estimado.
- **Carta** – imagem, dados, preços Cardmarket (tendência, médias 1/7/30 dias, mais baixo…), gráfico da **evolução do preço**, ligação ao Cardmarket.
- **Preços** – Pokémon TCG API como fonte principal e **TCGdex** como alternativa quando a primeira não tem preço (sets recentes). Quando não há preço, o site explica porquê.
- **Cache partilhada na base de dados** – os erros 5xx da API deixam de afetar a navegação; um cron diário atualiza os preços e guarda o histórico.
- Instalável no telemóvel (Chrome → «Adicionar ao ecrã inicial»).

## Configuração (uma vez)

### 1. Supabase
1. Cria o projeto (região da UE; «Enable automatic RLS» ligado).
2. **SQL Editor** → cola o conteúdo de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → **Run**.
3. **Authentication → Users → Add user** → cria o teu utilizador (email + password, marca «Auto confirm user»).
4. Para o site ser **só teu**: **Authentication → Sign In / Providers** → desativa «Allow new users to sign up».
5. Depois do deploy: **Authentication → URL Configuration** → define **Site URL** com o endereço do Vercel.
6. **Project Settings → API**: copia o *Project URL*, a chave *anon* e a chave *service_role*.

### 2. Variáveis de ambiente
Copia `.env.example` para `.env.local` (desenvolvimento) e define as mesmas no Vercel (**Settings → Environment Variables**, nos 3 ambientes):

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | chave service_role — **só no servidor, nunca com `NEXT_PUBLIC_`** |
| `CRON_SECRET` | texto aleatório longo (ex.: `openssl rand -hex 32`); o Vercel envia-o ao cron |
| `ADMIN_EMAILS` | o(s) teu(s) email(s) de administrador, separados por vírgula — dá acesso à página **Utilizadores** |
| `NEXT_PUBLIC_ALLOW_SIGNUP` | opcional: `true` ativa a página pública «Criar conta» (por omissão, desligada) |
| `POKEMONTCG_API_KEY` | opcional (chave gratuita em <https://dev.pokemontcg.io>) |

Depois de alterar variáveis, faz **Redeploy** (só afetam deploys novos).

### 3. Vercel
**Add New → Project** → importa este repositório. Cada push no `main` faz deploy. O cron diário
(`vercel.json`, 06:00 UTC) chama `/api/cron/prices`.

### Primeira utilização
Entra → **Sets** (a lista é descarregada sozinha) → abre um set (as cartas e preços são descarregados e
ficam em cache) → adiciona cartas com `+`.

## Utilizadores

Por omissão o site é **fechado**: só entra quem tiver conta criada por um administrador.

- **Criar utilizadores (recomendado):** define `ADMIN_EMAILS` com o teu email (o utilizador tem de existir). Depois de
  entrares aparece o separador **Utilizadores**, onde crias contas (email + password, já confirmadas) e apagas contas
  (apagar uma conta apaga também a coleção dessa pessoa).
- **Registo público (opcional):** põe `NEXT_PUBLIC_ALLOW_SIGNUP=true` e faz Redeploy; aparece «Criar conta» no login.
  No Supabase tem de estar ligado **Authentication → Sign In / Providers → Allow new users to sign up**, e
  **Authentication → URL Configuration → Redirect URLs** deve incluir `https://O-TEU-SITE/auth/callback`.
  O Supabase envia um email de confirmação; o servidor de email por omissão tem um limite baixo de envios por hora —
  para uso real configura um SMTP próprio (Authentication → SMTP Settings).
- Cada utilizador só vê e altera a **sua** coleção (RLS); sets, cartas e preços são partilhados.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preenche os valores
npm run dev                  # http://localhost:3000
npm run typecheck && npm test && npm run build
```

## Estrutura

```
supabase/migrations/   esquema SQL + RLS
src/lib/               tipos, mapeamento das APIs, agrupamento, sincronização (servidor)
src/app/               páginas (App Router), Server Actions e rotas /api
src/components/        componentes de interface
tests/                 testes das regras puras (agrupamento, espécies, mapeamento)
```

## Segurança

- RLS ligado em todas as tabelas: cada utilizador só vê e altera a **sua** coleção; sets, cartas e preços são leitura para quem tem sessão.
- A cache partilhada só é escrita no servidor (chave `service_role`), nunca no browser.
- Rotas protegidas por sessão (middleware); o cron exige `Authorization: Bearer $CRON_SECRET`.

## Notas legais

Pokémon e as imagens das cartas são propriedade da The Pokémon Company / Nintendo / Game Freak. Este projeto é
pessoal, sem fins comerciais e não afiliado. Confirma os termos das APIs (Pokémon TCG API, TCGdex, Cardmarket)
antes de qualquer uso público ou comercial.
