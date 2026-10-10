export type SetRow = {
  id: string;
  name: string;
  series: string;
  printed_total: number;
  total: number;
  release_date: string;
  logo_url: string;
  symbol_url: string;
};

export type CardRow = {
  id: string;
  name: string;
  set_id: string;
  set_name: string;
  number: string;
  number_sort: number;
  supertype: string;
  subtypes: string;
  hp: string | null;
  types: string;
  rarity: string | null;
  artist: string | null;
  image_small: string;
  image_large: string;
  cm_url: string | null;
  cm_updated_at: string | null;
  trend: number | null;
  avg_sell: number | null;
  low: number | null;
  avg1: number | null;
  avg7: number | null;
  avg30: number | null;
  reverse_trend: number | null;
  price_source: string | null;
  fetched_at: string;
};

/** Carta + dados do utilizador (quantidade, wishlist). */
export type OwnedCard = {
  card: CardRow;
  quantity: number;
  wishlist: boolean;
  addedAt: string;
};

/** Preço de referência (EUR): tendência do Cardmarket, com alternativas se faltar. */
export function cardPrice(c: Pick<CardRow, "trend" | "avg_sell" | "low" | "reverse_trend">): number | null {
  return c.trend ?? c.avg_sell ?? c.low ?? c.reverse_trend ?? null;
}
