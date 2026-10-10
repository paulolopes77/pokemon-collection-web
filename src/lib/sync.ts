import "server-only";
import { errorMessage } from "./errors";
import { createAdminClient } from "./supabase/admin";
import { fetchCardsByIds, fetchSetCardsPage, fetchSets, ApiError } from "./pokemontcg";
import { fetchStaticSetCards, fetchStaticSets } from "./staticdata";
import { fetchCardPrices, findSetId, listSetCards, lookupPrices } from "./tcgdex";
import { normalizeNumber } from "./tcgdex-rules";
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
      // Sem preços novos: mantém os que já tínhamos (e a data deles, para a cache continuar a contar como antiga).
      const merged = { ...c, cm_url: c.cm_url ?? old.cm_url, fetched_at: old.fetched_at } as Record<string, unknown>;
      for (const k of PRICE_KEYS) merged[k] = old[k];
      return merged as CardRow;
    }
    return old && c.cm_url == null ? { ...c, cm_url: old.cm_url } : c;
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
  // 1) catálogo estático (rápido e fiável)  2) Pokémon TCG API como alternativa
  let sets = await fetchStaticSets();
  if (!sets) sets = await fetchSets();
  const { error } = await createAdminClient().from("sets").upsert(sets, { onConflict: "id" });
  if (error) throw error;
  return sets.length;
}

export type SetSyncResult = {
  cards: number;
  /** de onde vieram as cartas */
  source: "catálogo estático" | "Pokémon TCG API";
  /** estado dos preços vindos da Pokémon TCG API */
  prices: "ok" | "parcial" | "indisponível";
  note: string | null;
};

/**
 * Sincroniza as cartas de um set. As cartas vêm do catálogo estático (fiável, todas de uma vez); depois tenta-se,
 * sem insistir, a Pokémon TCG API para os preços. Se o set ainda não estiver no catálogo estático, usa a API.
 */
export async function syncSetCards(setId: string, budgetMs = 25_000): Promise<SetSyncResult> {
  const db = createAdminClient();
  const { data: setRow } = await db.from("sets").select("id, name").eq("id", setId).maybeSingle();
  const set = (setRow as { id: string; name: string } | null) ?? { id: setId, name: "" };
  const start = Date.now();

  const staticCards = await fetchStaticSetCards(set);
  if (staticCards) await saveCards(staticCards);

  const PAGE = 50;
  let fetched = 0;
  let page = 1;
  let apiError: string | null = null;
  for (;;) {
    if (Date.now() - start > budgetMs) {
      apiError = "tempo esgotado";
      break;
    }
    try {
      // sem insistir: se a API estiver em baixo, não bloqueia o resto
      const { cards, totalCount } = await fetchSetCardsPage(setId, page, PAGE, { attempts: 1, timeoutMs: 12_000 });
      await saveCards(cards);
      fetched += cards.length;
      if (cards.length === 0 || page * PAGE >= totalCount) break;
      page++;
    } catch (e) {
      apiError = errorMessage(e);
      break;
    }
  }

  if (!staticCards && fetched === 0) throw new Error(apiError ?? "Não foi possível obter as cartas deste set.");
  const { count } = await db.from("cards").select("id", { count: "exact", head: true }).eq("set_id", setId);
  return {
    cards: count ?? staticCards?.length ?? fetched,
    source: staticCards ? "catálogo estático" : "Pokémon TCG API",
    prices: apiError == null ? "ok" : fetched > 0 ? "parcial" : "indisponível",
    note: apiError,
  };
}

export type SetPriceFill = { filled: number; remaining: number; note: string | null };

/**
 * Preenche, a partir da TCGdex, os preços das cartas de um set que a Pokémon TCG API deixou sem preço.
 * Faz 1 pedido por carta em falta (8 em paralelo) e para quando o orçamento de tempo acaba.
 */
export async function fillSetPrices(setId: string, budgetMs: number): Promise<SetPriceFill> {
  const db = createAdminClient();
  const { data: missingData, error } = await db
    .from("cards")
    .select("*")
    .eq("set_id", setId)
    .is("avg30", null)
    .is("avg7", null)
    .is("trend", null)
    .is("avg_sell", null)
    .is("reverse_trend", null);
  if (error) throw error;
  const missing = (missingData ?? []) as CardRow[];
  if (!missing.length) return { filled: 0, remaining: 0, note: null };

  const { data: set } = await db.from("sets").select("name, printed_total").eq("id", setId).maybeSingle();
  const info = set as { name: string; printed_total: number } | null;
  if (!info) return { filled: 0, remaining: missing.length, note: "Set desconhecido." };

  let byNumber: Map<string, string>;
  try {
    const tcgdexSetId = await findSetId(info.name, info.printed_total);
    if (!tcgdexSetId) {
      return { filled: 0, remaining: missing.length, note: `TCGdex não tem o set "${info.name}"` };
    }
    byNumber = await listSetCards(tcgdexSetId);
  } catch (e) {
    return { filled: 0, remaining: missing.length, note: `TCGdex indisponível (${errorMessage(e)})` };
  }

  const start = Date.now();
  const now = new Date().toISOString();
  const updated: CardRow[] = [];
  for (let i = 0; i < missing.length; i += 8) {
    if (Date.now() - start > budgetMs) break;
    await Promise.all(
      missing.slice(i, i + 8).map(async (card) => {
        const id = byNumber.get(normalizeNumber(card.number));
        if (!id) return;
        try {
          const prices = await fetchCardPrices(id, card.cm_updated_at);
          if (prices) updated.push({ ...card, ...prices, price_source: "tcgdex", fetched_at: now });
        } catch {
          // uma carta sem resposta não deve impedir as outras
        }
      }),
    );
  }
  if (updated.length) {
    const { error: upErr } = await db.from("cards").upsert(updated, { onConflict: "id" });
    if (upErr) throw upErr;
    await recordPrices(updated);
  }
  const remaining = missing.length - updated.length;
  return {
    filled: updated.length,
    remaining,
    note: remaining > 0 ? "Algumas cartas ainda não têm preço Cardmarket em nenhuma das APIs." : null,
  };
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
  const { data: missing } = await db.from("cards").select("*").in("id", ordered).is("avg30", null).is("avg7", null).is("trend", null).is("avg_sell", null).is("reverse_trend", null).limit(10);
  for (const c of (missing ?? []) as CardRow[]) {
    if (Date.now() - start > budgetMs) break;
    await fillMissingPrice(c);
  }
  return { updated, pending: 0 };
}
