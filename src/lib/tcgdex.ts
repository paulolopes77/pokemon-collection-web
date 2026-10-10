import "server-only";
import type { CardRow } from "./types";
import { speciesOf } from "./species";
import { positiveOrNull } from "./mappers";
import { alnum, normalizeNumber, pickTcgdexSet, sameSet, type SetBrief } from "./tcgdex-rules";

/**
 * TCGdex (https://tcgdex.dev) — API gratuita, usada só como alternativa quando a
 * Pokémon TCG API não tem preços Cardmarket para uma carta (por ex. sets muito recentes).
 */
const BASE = "https://api.tcgdex.net/v2/en";

type Brief = { id: string; localId?: string; name?: string };
type Cardmarket = {
  updated?: string;
  trend?: number | null;
  avg?: number | null;
  low?: number | null;
  avg1?: number | null;
  avg7?: number | null;
  avg30?: number | null;
  "avg-holo"?: number | null;
  "low-holo"?: number | null;
  "trend-holo"?: number | null;
};
type Full = {
  id: string;
  name?: string;
  set?: { name?: string; cardCount?: { official?: number } };
  pricing?: { cardmarket?: Cardmarket | null };
};

export type PriceFill = {
  prices: Pick<CardRow, "trend" | "avg_sell" | "low" | "avg1" | "avg7" | "avg30" | "reverse_trend" | "cm_updated_at"> | null;
  /** Porque não há preço (para mostrar ao utilizador). */
  note: string | null;
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}


const hasPrice = (cm: Cardmarket) =>
  [cm.trend, cm.avg, cm.low, cm["trend-holo"], cm["avg-holo"], cm["low-holo"]].some((v) => (v ?? 0) > 0);

function extractPrices(cm: Cardmarket, fallbackUpdated: string | null): NonNullable<PriceFill["prices"]> {
  return {
    trend: positiveOrNull(cm.trend ?? cm["trend-holo"]),
    avg_sell: positiveOrNull(cm.avg ?? cm["avg-holo"]),
    low: positiveOrNull(cm.low ?? cm["low-holo"]),
    avg1: positiveOrNull(cm.avg1),
    avg7: positiveOrNull(cm.avg7),
    avg30: positiveOrNull(cm.avg30),
    reverse_trend: positiveOrNull(cm["trend-holo"]),
    cm_updated_at: cm.updated ?? fallbackUpdated,
  };
}

// ---- Preços de um set inteiro ------------------------------------------------

export async function findSetId(name: string, printedTotal: number): Promise<string | null> {
  return pickTcgdexSet(await get<SetBrief[]>("/sets"), name, printedTotal);
}

/** número da carta (normalizado) -> id da carta na TCGdex */
export async function listSetCards(tcgdexSetId: string): Promise<Map<string, string>> {
  const set = await get<{ cards?: Brief[] }>(`/sets/${encodeURIComponent(tcgdexSetId)}`);
  return new Map((set.cards ?? []).map((b) => [normalizeNumber(b.localId ?? ""), b.id]));
}

export async function fetchCardPrices(tcgdexCardId: string, fallbackUpdated: string | null): Promise<PriceFill["prices"]> {
  const full = await get<Full>(`/cards/${encodeURIComponent(tcgdexCardId)}`);
  const cm = full.pricing?.cardmarket;
  return cm && hasPrice(cm) ? extractPrices(cm, fallbackUpdated) : null;
}

/** Procura a carta na TCGdex por nome + número + set. Devolve preços ou o motivo de falhar. */
export async function lookupPrices(card: CardRow, printedTotal: number): Promise<PriceFill> {
  try {
    const wanted = normalizeNumber(card.number);
    const names = [...new Set([card.name, speciesOf(card)].map((n) => n.trim()).filter(Boolean))];
    let seen = 0;
    const byNumber = new Map<string, Brief>();
    for (const name of names) {
      const list = await get<Brief[]>(`/cards?name=${encodeURIComponent(name)}`);
      seen += list.length;
      for (const b of list) if (normalizeNumber(b.localId ?? "") === wanted) byNumber.set(b.id, b);
      if (byNumber.size) break;
    }
    if (seen === 0) return { prices: null, note: `TCGdex não encontrou "${card.name}"` };
    if (byNumber.size === 0) {
      return { prices: null, note: `TCGdex tem ${seen} cartas com esse nome, nenhuma com o número #${card.number}` };
    }

    const otherSets: string[] = [];
    let withoutPrices = false;
    for (const brief of [...byNumber.values()].slice(0, 8)) {
      const full = await get<Full>(`/cards/${encodeURIComponent(brief.id)}`);
      otherSets.push(full.set?.name ?? "?");
      const sameName = alnum(full.name ?? "") === alnum(card.name);
      const setOk =
        sameSet(full.set?.name ?? "", card.set_name) ||
        (sameName && printedTotal > 0 && full.set?.cardCount?.official === printedTotal);
      if (!setOk) continue;
      const cm = full.pricing?.cardmarket;
      if (cm && hasPrice(cm)) return { prices: extractPrices(cm, card.cm_updated_at), note: null };
      withoutPrices = true;
    }
    return {
      prices: null,
      note: withoutPrices
        ? "TCGdex encontrou a carta mas sem preços Cardmarket"
        : `TCGdex tem #${card.number} em ${otherSets.join(", ")}, mas não em "${card.set_name}"`,
    };
  } catch (e) {
    return { prices: null, note: `TCGdex indisponível (${e instanceof Error ? e.message : "erro"})` };
  }
}
