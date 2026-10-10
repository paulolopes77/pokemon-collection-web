// Testa a segurança da partilha num Postgres real (PGlite), com as migrações verdadeiras do Supabase.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const A = "aaaaaaaa-0000-0000-0000-000000000001";
const B = "bbbbbbbb-0000-0000-0000-000000000002";
const C = "cccccccc-0000-0000-0000-000000000003";
const D = "dddddddd-0000-0000-0000-000000000004";

const migration = (n: string) => readFileSync(new URL(`../supabase/migrations/${n}`, import.meta.url), "utf8");

async function setup() {
  const db = new PGlite();
  // Simulação do que o Supabase fornece: schema auth, auth.uid() e os papéis.
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant select on auth.users to authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  `);
  for (const f of ["0001_init.sql", "0002_invites.sql", "0003_card_text.sql"]) await db.exec(migration(f));
  // Utilizadores que já existiam antes da migração 0004 (para testar o preenchimento de perfis)
  await db.exec(`insert into auth.users (id, email) values ('${A}', 'ana@exemplo.com'), ('${B}', 'bruno@exemplo.com')`);
  await db.exec(migration("0004_sharing.sql"));
  await db.exec(`insert into auth.users (id, email) values ('${C}', 'carla@exemplo.com'), ('${D}', 'diogo@exemplo.com')`);
  // Cartas (cache partilhada) e coleções
  await db.exec(`
    insert into public.cards (id, name, set_id, set_name, number) values
      ('c1', 'Pikachu', 's', 'S', '1'), ('c2', 'Charizard', 's', 'S', '2'), ('c3', 'Mew', 's', 'S', '3');
    insert into public.collection_items (user_id, card_id, quantity, wishlist, added_at) values
      ('${A}', 'c1', 2, false, '2026-01-02'),
      ('${A}', 'c2', 0, true,  '2026-01-03'),   -- só wishlist: NÃO deve ser partilhada
      ('${A}', 'c3', 1, false, '2026-01-01'),
      ('${B}', 'c1', 5, false, '2026-01-01');
  `);
  return db;
}

/** Corre `fn` como o utilizador autenticado `uid` (sujeito ao RLS) e volta a superuser no fim. */
async function as<T>(db: PGlite, uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${uid ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
const rows = async (db: PGlite, sql: string) => (await db.query<Record<string, unknown>>(sql)).rows;
const denied = async (p: Promise<unknown>) => p.then(() => null, (e: Error) => String(e.message));

test("sharing: profiles, shares and read-only access (real Postgres + RLS)", async () => {
  const db = await setup();

  // --- perfis: preenchimento dos utilizadores existentes + gatilho para os novos
  const profiles = await as(db, B, () => rows(db, "select id, display_name from public.profiles order by display_name"));
  assert.deepEqual(profiles.map((p) => p.display_name), ["ana", "bruno", "carla", "diogo"]);
  const columns = await rows(db, "select column_name from information_schema.columns where table_name = 'profiles'");
  assert.equal(columns.some((c) => c.column_name === "email"), false); // email não é exposto

  // --- sem partilha ninguém vê nada
  assert.equal((await as(db, B, () => rows(db, `select * from public.shared_collection('${A}')`))).length, 0);
  assert.equal((await as(db, B, () => rows(db, "select * from public.shared_with_me()"))).length, 0);
  // e a tabela da coleção continua privada: cada um só vê as suas linhas
  assert.deepEqual((await as(db, B, () => rows(db, "select user_id from public.collection_items"))).map((r) => r.user_id), [B]);

  // --- só o dono cria partilhas
  assert.match((await as(db, B, () => denied(db.exec(`insert into public.collection_shares (owner_id, viewer_id) values ('${A}', '${C}')`))))!, /row-level security/i);
  assert.match((await as(db, A, () => denied(db.exec(`insert into public.collection_shares (owner_id, viewer_id) values ('${A}', '${A}')`))))!, /check|violates/i); // não partilha consigo
  await as(db, A, () => db.exec(`insert into public.collection_shares (owner_id, viewer_id) values ('${A}', '${B}')`));

  // --- B vê a coleção de A: só cartas com quantidade > 0 (a carta só em wishlist não aparece)
  const shared = await as(db, B, () => rows(db, `select * from public.shared_collection('${A}')`));
  const list = shared.map((r) => (r as { shared_collection: { card: { id: string; name: string }; quantity: number } }).shared_collection);
  assert.deepEqual(list.map((x) => [x.card.id, x.card.name, x.quantity]), [["c1", "Pikachu", 2], ["c3", "Mew", 1]]);
  assert.equal(list.some((x) => x.card.id === "c2"), false);

  // --- C e D (sem partilha) não vêem nada; A não vê a de B
  assert.equal((await as(db, C, () => rows(db, `select * from public.shared_collection('${A}')`))).length, 0);
  assert.equal((await as(db, A, () => rows(db, `select * from public.shared_collection('${B}')`))).length, 0);

  // --- shared_with_me
  const withMe = await as(db, B, () => rows(db, "select * from public.shared_with_me()"));
  assert.deepEqual(withMe.map((r) => [r.owner_id, r.display_name, r.unique_cards, r.total_cards]), [[A, "ana", 2, 3]]);
  assert.equal((await as(db, C, () => rows(db, "select * from public.shared_with_me()"))).length, 0);

  // --- visibilidade das linhas de partilha: dono e destinatário vêem-nas; um terceiro não
  assert.equal((await as(db, A, () => rows(db, "select * from public.collection_shares"))).length, 1);
  assert.equal((await as(db, B, () => rows(db, "select * from public.collection_shares"))).length, 1);
  assert.equal((await as(db, C, () => rows(db, "select * from public.collection_shares"))).length, 0);

  // --- só leitura: B não consegue alterar, apagar nem inserir na coleção de A
  await as(db, B, () => db.exec(`update public.collection_items set quantity = 99 where user_id = '${A}'`));
  await as(db, B, () => db.exec(`delete from public.collection_items where user_id = '${A}'`));
  assert.match((await as(db, B, () => denied(db.exec(`insert into public.collection_items (user_id, card_id, quantity) values ('${A}', 'c3', 7)`))))!, /row-level security/i);
  await as(db, B, () => db.exec("select public.adjust_quantity('c3', 5)")); // só mexe nas linhas do próprio B
  const aItems = await rows(db, `select card_id, quantity from public.collection_items where user_id = '${A}' order by card_id`);
  assert.deepEqual(aItems.map((r) => [r.card_id, r.quantity]), [["c1", 2], ["c2", 0], ["c3", 1]]); // intactas
  assert.equal(((await rows(db, `select quantity from public.collection_items where user_id = '${B}' and card_id = 'c3'`))[0] as { quantity: number }).quantity, 5);

  // --- B não consegue retirar nem criar partilhas de A
  await as(db, B, () => db.exec(`delete from public.collection_shares where owner_id = '${A}'`));
  assert.equal((await rows(db, "select * from public.collection_shares")).length, 1);

  // --- perfis: cada um só altera o seu
  await as(db, B, () => db.exec(`update public.profiles set display_name = 'HACK' where id = '${A}'`));
  assert.equal(((await rows(db, `select display_name from public.profiles where id = '${A}'`))[0] as { display_name: string }).display_name, "ana");
  await as(db, B, () => db.exec(`update public.profiles set display_name = 'Bruno S.' where id = '${B}'`));
  assert.equal(((await rows(db, `select display_name from public.profiles where id = '${B}'`))[0] as { display_name: string }).display_name, "Bruno S.");

  // --- sem sessão (anon) não há acesso nenhum
  assert.match((await as(db, null, () => denied(db.query(`select * from public.shared_collection('${A}')`))))!, /permission denied/i);
  assert.match((await as(db, null, () => denied(db.query("select * from public.shared_with_me()"))))!, /permission denied/i);
  assert.equal((await as(db, null, () => rows(db, "select * from public.collection_shares"))).length, 0); // RLS: 0 linhas

  // --- retirar a partilha corta o acesso de imediato
  await as(db, A, () => db.exec(`delete from public.collection_shares where viewer_id = '${B}'`));
  assert.equal((await as(db, B, () => rows(db, `select * from public.shared_collection('${A}')`))).length, 0);

  // --- apagar o utilizador apaga as suas partilhas e perfil (cascata)
  await as(db, A, () => db.exec(`insert into public.collection_shares (owner_id, viewer_id) values ('${A}', '${C}')`));
  await db.exec(`delete from auth.users where id = '${A}'`);
  assert.equal((await rows(db, "select * from public.collection_shares")).length, 0);
  assert.equal((await rows(db, `select * from public.profiles where id = '${A}'`)).length, 0);

  await db.close();
});
