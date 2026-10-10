-- Coleção Pokémon (web) — esquema inicial.
-- Cola este ficheiro no Supabase → SQL Editor e carrega em Run.

-- ---------------------------------------------------------------------------
-- Cache partilhada (sets, cartas, histórico de preços). Só o servidor escreve
-- (chave service_role, que ignora o RLS); utilizadores com sessão só leem.
-- ---------------------------------------------------------------------------
create table if not exists public.sets (
  id            text primary key,
  name          text not null,
  series        text not null default '',
  printed_total int  not null default 0,
  total         int  not null default 0,
  release_date  text not null default '',
  logo_url      text not null default '',
  symbol_url    text not null default '',
  updated_at    timestamptz not null default now()
);

create table if not exists public.cards (
  id            text primary key,
  name          text not null,
  set_id        text not null default '',
  set_name      text not null default '',
  number        text not null default '',
  number_sort   int  not null default 0,
  supertype     text not null default '',
  subtypes      text not null default '',
  hp            text,
  types         text not null default '',
  rarity        text,
  artist        text,
  image_small   text not null default '',
  image_large   text not null default '',
  cm_url        text,
  cm_updated_at text,
  trend         numeric,
  avg_sell      numeric,
  low           numeric,
  avg1          numeric,
  avg7          numeric,
  avg30         numeric,
  reverse_trend numeric,
  price_source  text,                       -- 'pokemontcg' | 'tcgdex'
  fetched_at    timestamptz not null default now()
);
create index if not exists cards_set_id_idx on public.cards (set_id);
create index if not exists cards_name_idx   on public.cards (lower(name));

-- Um registo por carta e por dia (evolução do preço).
create table if not exists public.card_prices (
  card_id   text not null references public.cards (id) on delete cascade,
  day       date not null default (now() at time zone 'utc')::date,
  trend     numeric,
  avg_sell  numeric,
  low       numeric,
  avg7      numeric,
  avg30     numeric,
  primary key (card_id, day)
);

-- ---------------------------------------------------------------------------
-- Dados do utilizador
-- ---------------------------------------------------------------------------
create table if not exists public.collection_items (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id    text not null references public.cards (id) on delete cascade,
  quantity   int  not null default 0 check (quantity >= 0),
  wishlist   boolean not null default false,
  added_at   timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);
create index if not exists collection_items_card_idx on public.collection_items (card_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.sets             enable row level security;
alter table public.cards            enable row level security;
alter table public.card_prices      enable row level security;
alter table public.collection_items enable row level security;

drop policy if exists "sets_read"        on public.sets;
drop policy if exists "cards_read"       on public.cards;
drop policy if exists "card_prices_read" on public.card_prices;
create policy "sets_read"        on public.sets        for select to authenticated using (true);
create policy "cards_read"       on public.cards       for select to authenticated using (true);
create policy "card_prices_read" on public.card_prices for select to authenticated using (true);

drop policy if exists "items_select" on public.collection_items;
drop policy if exists "items_insert" on public.collection_items;
drop policy if exists "items_update" on public.collection_items;
drop policy if exists "items_delete" on public.collection_items;
create policy "items_select" on public.collection_items for select to authenticated
  using (user_id = auth.uid());
create policy "items_insert" on public.collection_items for insert to authenticated
  with check (user_id = auth.uid());
create policy "items_update" on public.collection_items for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "items_delete" on public.collection_items for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Operações atómicas (security invoker: respeitam o RLS do utilizador)
-- ---------------------------------------------------------------------------
create or replace function public.adjust_quantity(p_card_id text, p_delta int)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into collection_items (user_id, card_id, quantity)
  values (auth.uid(), p_card_id, greatest(0, p_delta))
  on conflict (user_id, card_id) do update
    set quantity   = greatest(0, collection_items.quantity + p_delta),
        updated_at = now();

  delete from collection_items
   where user_id = auth.uid() and card_id = p_card_id
     and quantity <= 0 and wishlist = false;
end;
$$;

create or replace function public.toggle_wishlist(p_card_id text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into collection_items (user_id, card_id, quantity, wishlist)
  values (auth.uid(), p_card_id, 0, true)
  on conflict (user_id, card_id) do update
    set wishlist   = not collection_items.wishlist,
        updated_at = now();

  delete from collection_items
   where user_id = auth.uid() and card_id = p_card_id
     and quantity <= 0 and wishlist = false;
end;
$$;

revoke all on function public.adjust_quantity(text, int) from public, anon;
revoke all on function public.toggle_wishlist(text)      from public, anon;
grant execute on function public.adjust_quantity(text, int) to authenticated;
grant execute on function public.toggle_wishlist(text)      to authenticated;
