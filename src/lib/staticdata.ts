import "server-only";
import { staticToCardRow, toSetRow, type ApiCard, type ApiSet } from "./mappers";
import type { CardRow, SetRow } from "./types";

/**
 * Catálogo estático (https://github.com/PokemonTCG/pokemon-tcg-data): um ficheiro JSON por set, servido pelo
 * CDN do GitHub. É rápido e muito mais fiável do que a API (que dá 500/502 com frequência), mas NÃO tem preços.
 */
const BASE = "https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master";

async function getJson<T>(path: string): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${BASE}/${path}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
      if (res.status === 404) return null;
      if (res.ok) return (await res.json()) as T;
    } catch {
      /* tenta outra vez */
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return null;
}

export async function fetchStaticSets(): Promise<SetRow[] | null> {
  const sets = await getJson<ApiSet[]>("sets/en.json");
  return sets && sets.length ? sets.map(toSetRow) : null;
}

export async function fetchStaticSetCards(set: Pick<SetRow, "id" | "name">): Promise<CardRow[] | null> {
  const cards = await getJson<ApiCard[]>(`cards/en/${encodeURIComponent(set.id)}.json`);
  if (!cards || !cards.length) return null;
  const now = new Date();
  return cards.map((c) => staticToCardRow(c, set, now));
}
