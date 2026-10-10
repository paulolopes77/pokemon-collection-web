import "server-only";
import { describeHttpFailure } from "./http-errors";
import { buildNameQuery, toCardRow, toSetRow, type ApiCard, type ApiSet } from "./mappers";
import type { CardRow, SetRow } from "./types";

const BASE = "https://api.pokemontcg.io/v2";
const CARD_FIELDS = "id,name,supertype,subtypes,hp,types,rarity,number,artist,set,images,cardmarket";
const ATTEMPTS = 3;
const TIMEOUT_MS = 20_000;

type Page<T> = { data: T[]; page: number; pageSize: number; count: number; totalCount: number };

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A API é por vezes lenta ou devolve 5xx/429: tenta até 3 vezes com pausa crescente. */
async function request<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  const headers: Record<string, string> = {};
  if (process.env.POKEMONTCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;

  let last: ApiError | undefined;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.ok) return (await res.json()) as T;
      const body = await res.text();
      last = new ApiError(describeHttpFailure("Pokémon TCG API", res.status, body), res.status);
      if (res.status < 500 && res.status !== 429) throw last; // erro do pedido: não repetir
    } catch (e) {
      if (e instanceof ApiError && e.status && e.status < 500 && e.status !== 429) throw e;
      last = e instanceof ApiError ? e : new ApiError("Pokémon TCG API: sem ligação ou demasiado lenta");
    }
    if (attempt < ATTEMPTS - 1) await sleep(1500 * (attempt + 1));
  }
  throw last ?? new ApiError("Pokémon TCG API: falha desconhecida");
}

export async function fetchSets(): Promise<SetRow[]> {
  const res = await request<Page<ApiSet>>("/sets", { orderBy: "-releaseDate", pageSize: 250 });
  return res.data.map(toSetRow);
}

export async function fetchCards(
  q: string,
  opts: { page?: number; pageSize?: number; orderBy?: string } = {},
): Promise<{ cards: CardRow[]; totalCount: number }> {
  const res = await request<Page<ApiCard>>("/cards", {
    q,
    page: opts.page ?? 1,
    pageSize: opts.pageSize ?? 50,
    orderBy: opts.orderBy,
    select: CARD_FIELDS,
  });
  const now = new Date();
  return { cards: res.data.map((c) => toCardRow(c, now)), totalCount: res.totalCount };
}

export const fetchSetCardsPage = (setId: string, page: number, pageSize = 50) =>
  fetchCards(`set.id:"${setId}"`, { page, pageSize });

export async function searchByName(text: string): Promise<CardRow[]> {
  const q = buildNameQuery(text);
  if (!q) return [];
  return (await fetchCards(q, { pageSize: 60, orderBy: "-set.releaseDate" })).cards;
}

export async function fetchCardsByIds(ids: string[]): Promise<CardRow[]> {
  if (!ids.length) return [];
  const q = ids.map((id) => `id:"${id}"`).join(" OR ");
  return (await fetchCards(q, { pageSize: ids.length })).cards;
}
