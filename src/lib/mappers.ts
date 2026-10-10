import { cardPrice, type CardRow, type CardText, type SetRow } from "./types";

// ---- Pokémon TCG API (https://docs.pokemontcg.io) -------------------------
export type ApiSet = {
  id: string;
  name?: string;
  series?: string;
  printedTotal?: number;
  total?: number;
  releaseDate?: string;
  images?: { symbol?: string; logo?: string };
};

export type ApiCard = {
  id: string;
  name?: string;
  supertype?: string;
  subtypes?: string[];
  hp?: string | null;
  types?: string[];
  rarity?: string | null;
  number?: string;
  artist?: string | null;
  set?: ApiSet | null;
  images?: { small?: string; large?: string };
  abilities?: { name?: string; text?: string; type?: string }[] | null;
  attacks?: { name?: string; cost?: string[]; damage?: string; text?: string }[] | null;
  weaknesses?: { type?: string; value?: string }[] | null;
  resistances?: { type?: string; value?: string }[] | null;
  retreatCost?: string[] | null;
  rules?: string[] | null;
  flavorText?: string | null;
  evolvesFrom?: string | null;
  regulationMark?: string | null;
  cardmarket?: {
    url?: string | null;
    updatedAt?: string | null;
    prices?: {
      averageSellPrice?: number | null;
      lowPrice?: number | null;
      trendPrice?: number | null;
      avg1?: number | null;
      avg7?: number | null;
      avg30?: number | null;
      reverseHoloTrend?: number | null;
    } | null;
  } | null;
};

/** O Cardmarket por vezes devolve 0 quando não há dados; tratamos como sem preço. */
export const positiveOrNull = (n: number | null | undefined): number | null =>
  typeof n === "number" && n > 0 ? n : null;

/** Número de ordenação a partir de "25", "SWSH001", "TG05"... */
export function numberSortKey(number: string): number {
  const m = number.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

export function toSetRow(s: ApiSet): SetRow {
  return {
    id: s.id,
    name: s.name ?? "",
    series: s.series ?? "",
    printed_total: s.printedTotal ?? 0,
    total: s.total ?? 0,
    release_date: s.releaseDate ?? "",
    logo_url: s.images?.logo ?? "",
    symbol_url: s.images?.symbol ?? "",
  };
}

export const EMPTY_CARD_TEXT: CardText = {
  abilities: [], attacks: [], weaknesses: [], resistances: [], retreat: [], rules: [],
  flavor: null, evolvesFrom: null, regulationMark: null,
};

/** Texto da carta; null se a fonte não trouxe nenhum dos campos (para não apagar texto já guardado). */
export function toCardText(c: ApiCard): CardText | null {
  const hasAny = [c.abilities, c.attacks, c.weaknesses, c.resistances, c.retreatCost, c.rules, c.flavorText, c.evolvesFrom].some(
    (v) => v != null,
  );
  if (!hasAny) return null;
  return {
    abilities: (c.abilities ?? []).map((a) => ({ name: a.name ?? "", text: a.text ?? "", type: a.type ?? "Ability" })),
    attacks: (c.attacks ?? []).map((a) => ({
      name: a.name ?? "",
      cost: a.cost ?? [],
      damage: a.damage ?? "",
      text: a.text ?? "",
    })),
    weaknesses: (c.weaknesses ?? []).map((w) => ({ type: w.type ?? "", value: w.value ?? "" })),
    resistances: (c.resistances ?? []).map((w) => ({ type: w.type ?? "", value: w.value ?? "" })),
    retreat: c.retreatCost ?? [],
    rules: c.rules ?? [],
    flavor: c.flavorText ?? null,
    evolvesFrom: c.evolvesFrom ?? null,
    regulationMark: c.regulationMark ?? null,
  };
}

export function toCardRow(c: ApiCard, now = new Date()): CardRow {
  const p = c.cardmarket?.prices;
  const trend = positiveOrNull(p?.trendPrice);
  const avgSell = positiveOrNull(p?.averageSellPrice);
  const low = positiveOrNull(p?.lowPrice);
  const reverse = positiveOrNull(p?.reverseHoloTrend);
  const number = c.number ?? "";
  const row: CardRow = {
    id: c.id,
    name: c.name ?? "",
    set_id: c.set?.id ?? "",
    set_name: c.set?.name ?? "",
    number,
    number_sort: numberSortKey(number),
    supertype: c.supertype ?? "",
    subtypes: (c.subtypes ?? []).join(", "),
    hp: c.hp ?? null,
    types: (c.types ?? []).join(", "),
    rarity: c.rarity ?? null,
    artist: c.artist ?? null,
    image_small: c.images?.small ?? "",
    image_large: c.images?.large ?? "",
    cm_url: c.cardmarket?.url ?? null,
    cm_updated_at: c.cardmarket?.updatedAt ?? null,
    trend,
    avg_sell: avgSell,
    low,
    avg1: positiveOrNull(p?.avg1),
    avg7: positiveOrNull(p?.avg7),
    avg30: positiveOrNull(p?.avg30),
    reverse_trend: reverse,
    price_source: null,
    card_text: toCardText(c),
    fetched_at: now.toISOString(),
  };
  row.price_source = cardPrice(row) != null ? "pokemontcg" : null;
  return row;
}

/**
 * Constrói a query Lucene da API a partir do texto do utilizador:
 * "mr mime" -> `name:mr* name:mime*`. Remove tudo o que não seja letra/dígito.
 */
export function buildNameQuery(text: string): string | null {
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  return words.length ? words.map((w) => `name:${w}*`).join(" ") : null;
}

/**
 * Carta do repositório estático PokemonTCG/pokemon-tcg-data (mesmos ids da API, sem preços e sem o campo `set`).
 */
export function staticToCardRow(c: ApiCard, set: Pick<SetRow, "id" | "name">, now = new Date()): CardRow {
  const row = toCardRow({ ...c, set: { id: set.id, name: set.name } }, now);
  // O catálogo estático é completo: sem campos de texto significa «esta carta não tem texto» (e não «por carregar»).
  row.card_text = row.card_text ?? EMPTY_CARD_TEXT;
  return row;
}
