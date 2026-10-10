import "server-only";
import { createAdminClient } from "./supabase/admin";
import { fetchCardsByIds, fetchSetCardsPage, fetchSets, ApiError } from "./pokemontcg";
import { lookupPrices } from "./tcgdex";
import { cardPrice, type CardRow } from "./types";

const PRICE_KEYS = ["trend", "avg_sell", "low", "avg1", "avg7", "avg30", "reverse_trend", "cm_updated_at", "price_source"] as const;

/**
 * Guarda cartas na cache sem apagar preços que já tínhamos (por ex. obtidos na TCGdex)
 * quando a Pokémon TCG API continua sem preços; e regista o preço do dia no histórico.
 */
export async function saveCards(cards: CardRow[]): Promise<void> {
  if (!cards.length) return;
  const db = createAdminClient();
  const { data: existing, error: e1 } = await db.from("cards").select("*").in("id", cards.map((c) => c.id));
  if (e1) throw e1;
  const prev = new Map((existing as CardRow[] | null)?.map((c) => [c.id, c]));

  const rows = cards.map((c) => {
    const old = prev.get(c.id);
    if (cardPrice(c) == null && old && cardPrice(old) != null) {
      const merged = { ...c } as Record<string, unknown>;
      for (const k of PRICE_KEYS) merged[k] = old[k];
      return merged as CardRow;
    }
    return c;
  });
  const { error: e2 } = await db.from("cards").upsert(rows, { onConflict: "id" });
  if (e2) throw e2;
  await recordPrices(rows);
}

async function recordPrices(cards: CardRow[]): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const snaps = cards
    .filter((c) => cardPrice(c) != null)
    .map((c) => ({ card_id: c.id, day, trend: c.trend, avg_sell: c.avg_sell, low: c.low, avg7: c.avg7, avg30: c.avg30 }));
  if (!snaps.length) return;
  const { error } = await createAdminClient().from("card_prices").upsert(snaps, { onConflict: "card_id,day" });
  if (error) throw error;
}

export async function syncSets(): Promise<number> {
  const sets = await fetchSets();
  const { error } = await createAdminClient().from("sets").upsert(sets, { onConflict: "id" });
  if (error) throw error;
  return sets.length;
}

export async function syncSetCards(setId: string): Promise<number> {
  const PAGE = 50;
  let page = 1;
  let total = 0;
  for (;;) {
    const { cards, totalCount } = await fetchSetCardsPage(setId, page, PAGE);
    await saveCards(cards);
    total += cards.length;
    if (cards.length === 0 || page * PAGE >= totalCount) break;
    page++;
  }
  return total;
}

export type PriceLookup = { card: CardRow; note: string | null };

/** Se a carta não tem preço, tenta a TCGdex. Nunca lança erros (é só um extra). */
export async function fillMissingPrice(card: CardRow): Promise<PriceLookup> {
  if (cardPrice(card) != null) return { card, note: null };
  const db = createAdminClient();
  const { data: set } = await db.from("sets").select("printed_total").eq("id", card.set_id).maybeSingle();
  const { prices, note } = await lookupPrices(card, (set as { printed_total: number } | null)?.printed_total ?? 0);
  if (!prices) return { card, note };
  const updated: CardRow = { ...card, ...prices, price_source: "tcgdex", fetched_at: new Date().toISOString() };
  const { error } = await db.from("cards").upsert(updated, { onConflict: "id" });
  if (error) throw error;
  await recordPrices([updated]);
  return { card: updated, note: null };
}

/** Atualiza uma carta (e tenta a TCGdex se não houver preço). Null se a API não a encontrar. */
export async function refreshCard(id: string): Promise<PriceLookup | null> {
  const [fresh] = await fetchCardsByIds([id]);
  if (!fresh) return null;
  await saveCards([fresh]);
  const { data } = await createAdminClient().from("cards").select("*").eq("id", id).single();
  const stored = data as CardRow;
  const mainNote =
    cardPrice(stored) != null ? null : fresh.cm_url == null && fresh.cm_updated_at == null
      ? "Pokémon TCG API: sem dados do Cardmarket"
      : "Pokémon TCG API: preços Cardmarket vazios";
  const second = await fillMissingPrice(stored);
  const note = [mainNote, second.note].filter(Boolean).join(" · ") || null;
  return { card: second.card, note };
}

/**
 * Atualiza os preços das cartas que alguém tem na coleção/wishlist, das mais antigas para as
 * mais recentes, dentro de um orçamento de tempo (as funções serverless têm limite de duração).
 */
export async function refreshTracked(budgetMs: number, maxCards = 200): Promise<{ updated: number; pending: number }> {
  const db = createAdminClient();
  const { data: items, error } = await db.from("collection_items").select("card_id");
  if (error) throw error;
  const ids = [...new Set((items ?? []).map((i: { card_id: string }) => i.card_id))];
  if (!ids.length) return { updated: 0, pending: 0 };

  const { data: cards } = await db.from("cards").select("id, fetched_at").in("id", ids).order("fetched_at", { ascending: true });
  const ordered = ((cards ?? []) as { id: string }[]).map((c) => c.id).slice(0, maxCards);

  const start = Date.now();
  let updated = 0;
  for (let i = 0; i < ordered.length; i += 20) {
    if (Date.now() - start > budgetMs) return { updated, pending: ordered.length - i };
    try {
      const chunk = await fetchCardsByIds(ordered.slice(i, i + 20));
      await saveCards(chunk);
      updated += chunk.length;
    } catch (e) {
      if (e instanceof ApiError) return { updated, pending: ordered.length - i };
      throw e;
    }
  }
  // Cartas que a API principal continua a não ter preço: TCGdex (máx. 10 por execução).
  const { data: missing } = await db.from("cards").select("*").in("id", ordered).is("trend", null).is("avg_sell", null).is("low", null).limit(10);
  for (const c of (missing ?? []) as CardRow[]) {
    if (Date.now() - start > budgetMs) break;
    await fillMissingPrice(c);
  }
  return { updated, pending: 0 };
}
