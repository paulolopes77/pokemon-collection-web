import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardRow, OwnedCard, SetRow } from "./types";

const PAGE = 1000; // limite de linhas por pedido do Supabase

type ItemRow = {
  quantity: number;
  wishlist: boolean;
  added_at: string;
  cards: CardRow | CardRow[] | null;
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** Cartas que o utilizador tem (quantity > 0) ou quer (wishlist), com a carta embebida. */
export async function loadCollection(supabase: SupabaseClient, mode: "owned" | "wishlist"): Promise<OwnedCard[]> {
  const out: OwnedCard[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("collection_items")
      .select("quantity, wishlist, added_at, cards(*)")
      .order("added_at", { ascending: false })
      .range(from, from + PAGE - 1);
    q = mode === "owned" ? q.gt("quantity", 0) : q.eq("wishlist", true);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as unknown as ItemRow[];
    for (const r of rows) {
      const card = one(r.cards);
      if (card) out.push({ card, quantity: r.quantity, wishlist: r.wishlist, addedAt: r.added_at });
    }
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function loadSets(supabase: SupabaseClient): Promise<SetRow[]> {
  const { data, error } = await supabase.from("sets").select("*").order("release_date", { ascending: false }).limit(1000);
  if (error) throw error;
  return (data ?? []) as SetRow[];
}

/** set_id -> nº de cartas diferentes que o utilizador tem. */
export async function loadOwnedBySet(supabase: SupabaseClient): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("collection_items")
      .select("cards(set_id)")
      .gt("quantity", 0)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown as { cards: { set_id: string } | { set_id: string }[] | null }[];
    for (const r of rows) {
      const c = one(r.cards);
      if (c) counts[c.set_id] = (counts[c.set_id] ?? 0) + 1;
    }
    if (rows.length < PAGE) break;
  }
  return counts;
}

/** Quantidade/wishlist do utilizador para um conjunto de cartas. */
export async function loadItemsFor(
  supabase: SupabaseClient,
  cardIds: string[],
): Promise<Record<string, { quantity: number; wishlist: boolean; addedAt: string }>> {
  const out: Record<string, { quantity: number; wishlist: boolean; addedAt: string }> = {};
  for (let i = 0; i < cardIds.length; i += 200) {
    const { data, error } = await supabase
      .from("collection_items")
      .select("card_id, quantity, wishlist, added_at")
      .in("card_id", cardIds.slice(i, i + 200));
    if (error) throw error;
    for (const r of (data ?? []) as { card_id: string; quantity: number; wishlist: boolean; added_at: string }[]) {
      out[r.card_id] = { quantity: r.quantity, wishlist: r.wishlist, addedAt: r.added_at };
    }
  }
  return out;
}
