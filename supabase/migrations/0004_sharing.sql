-- Partilha da coleção (só leitura) entre utilizadores do site.
--  • profiles: nome visível de cada utilizador (para a lista «Partilhar» e «Partilhado comigo»)
--  • collection_shares: quem partilhou a sua coleção com quem
--  • shared_collection(owner) / shared_with_me(): leitura das coleções que foram partilhadas contigo
-- A tabela collection_items NÃO muda: continua só acessível pelo próprio dono. Quem recebe a partilha lê
-- através das funções abaixo (security definer), que só devolvem cartas com quantidade > 0 e só se o dono
-- tiver partilhado com quem pede. Ninguém consegue escrever na coleção de outra pessoa.

-- ---------------------------------------------------------------------------
-- Perfis (nome visível). O email NÃO é exposto aos outros utilizadores.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles_read"       on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_read"       on public.profiles for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Cria o perfil de cada novo utilizador (nome = parte do email antes do @).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(split_part(new.email, '@', 1), ''), 'utilizador'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Perfis dos utilizadores que já existem.
insert into public.profiles (id, display_name)
select id, coalesce(nullif(split_part(email, '@', 1), ''), 'utilizador')
from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Partilhas: o dono (owner) deixa o viewer ver a sua coleção.
-- ---------------------------------------------------------------------------
create table if not exists public.collection_shares (
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  viewer_id  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, viewer_id),
  check (owner_id <> viewer_id)
);
create index if not exists collection_shares_viewer_idx on public.collection_shares (viewer_id);
alter table public.collection_shares enable row level security;

drop policy if exists "shares_select" on public.collection_shares;
drop policy if exists "shares_insert" on public.collection_shares;
drop policy if exists "shares_delete" on public.collection_shares;
-- vês as partilhas que fizeste e as que fizeram contigo
create policy "shares_select" on public.collection_shares for select to authenticated
  using (owner_id = auth.uid() or viewer_id = auth.uid());
-- só o dono cria e retira partilhas da sua coleção
create policy "shares_insert" on public.collection_shares for insert to authenticated
  with check (owner_id = auth.uid());
create policy "shares_delete" on public.collection_shares for delete to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Leitura das coleções partilhadas contigo (só leitura)
-- ---------------------------------------------------------------------------
-- Cartas (com a ficha completa) que `p_owner` tem, SE ele partilhou a coleção com quem chama.
create or replace function public.shared_collection(p_owner uuid)
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('card', to_jsonb(c), 'quantity', ci.quantity, 'added_at', ci.added_at)
  from public.collection_items ci
  join public.cards c on c.id = ci.card_id
  where ci.user_id = p_owner
    and ci.quantity > 0
    and exists (
      select 1 from public.collection_shares s
      where s.owner_id = p_owner and s.viewer_id = auth.uid()
    )
  order by ci.added_at desc, ci.card_id
$$;

-- Quem partilhou a coleção contigo, com o nome e o resumo (n.º de cartas).
create or replace function public.shared_with_me()
returns table (owner_id uuid, display_name text, unique_cards int, total_cards int)
language sql
stable
security definer
set search_path = public
as $$
  select s.owner_id,
         p.display_name,
         count(ci.card_id)::int,
         coalesce(sum(ci.quantity), 0)::int
  from public.collection_shares s
  join public.profiles p on p.id = s.owner_id
  left join public.collection_items ci on ci.user_id = s.owner_id and ci.quantity > 0
  where s.viewer_id = auth.uid()
  group by s.owner_id, p.display_name
  order by lower(p.display_name)
$$;

revoke all on function public.shared_collection(uuid) from public, anon;
revoke all on function public.shared_with_me()        from public, anon;
grant execute on function public.shared_collection(uuid) to authenticated;
grant execute on function public.shared_with_me()        to authenticated;
