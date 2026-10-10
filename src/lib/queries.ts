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

// ---------------------------------------------------------------------------
// Partilha da coleção (migração 0004). Se a migração ainda não foi corrida, `available` é false.
// ---------------------------------------------------------------------------
export type Profile = { id: string; display_name: string };
export type SharedOwner = { owner_id: string; display_name: string; unique_cards: number; total_cards: number };

/** Erro de «tabela/função não existe» (migração 0004 por correr). */
export function isMissingSharing(e: { code?: string; message?: string } | null): boolean {
  if (!e) return false;
  return ["42P01", "42883", "PGRST202", "PGRST205"].includes(e.code ?? "") || /does not exist|schema cache/i.test(e.message ?? "");
}

/** Outros utilizadores do site + com quem já partilhei a minha coleção. */
export async function loadShareState(
  supabase: SupabaseClient,
  myId: string,
): Promise<{ available: boolean; users: Profile[]; sharedWith: string[] }> {
  const [profiles, shares] = await Promise.all([
    supabase.from("profiles").select("id, display_name").neq("id", myId).limit(1000),
    supabase.from("collection_shares").select("viewer_id").eq("owner_id", myId),
  ]);
  for (const r of [profiles, shares]) {
    if (isMissingSharing(r.error)) return { available: false, users: [], sharedWith: [] };
    if (r.error) throw r.error;
  }
  const users = ((profiles.data ?? []) as Profile[]).sort((a, b) => a.display_name.localeCompare(b.display_name, "pt", { sensitivity: "base" }));
  return { available: true, users, sharedWith: ((shares.data ?? []) as { viewer_id: string }[]).map((s) => s.viewer_id) };
}

export async function loadSharedWithMe(supabase: SupabaseClient): Promise<{ available: boolean; owners: SharedOwner[] }> {
  const { data, error } = await supabase.rpc("shared_with_me");
  if (isMissingSharing(error)) return { available: false, owners: [] };
  if (error) throw error;
  return { available: true, owners: (data ?? []) as SharedOwner[] };
}

/** Coleção de `ownerId` (só se a partilhou comigo; senão vem vazia). */
export async function loadSharedCollection(supabase: SupabaseClient, ownerId: string): Promise<OwnedCard[]> {
  const { data, error } = await supabase.rpc("shared_collection", { p_owner: ownerId });
  if (error) throw error;
  return ((data ?? []) as { card: CardRow; quantity: number; added_at: string }[]).map((r) => ({
    card: r.card,
    quantity: r.quantity,
    wishlist: false,
    addedAt: r.added_at,
  }));
}
