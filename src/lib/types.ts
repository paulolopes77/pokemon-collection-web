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

/** Texto da carta (em inglês), tal como vem da Pokémon TCG API / catálogo estático. */
export type CardText = {
  abilities: { name: string; text: string; type: string }[];
  attacks: { name: string; cost: string[]; damage: string; text: string }[];
  weaknesses: { type: string; value: string }[];
  resistances: { type: string; value: string }[];
  retreat: string[];
  rules: string[];
  flavor: string | null;
  evolvesFrom: string | null;
  regulationMark: string | null;
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
  /** null = ainda não descarregado (ou a coluna card_text não existe: ver migração 0003) */
  card_text?: CardText | null;
  fetched_at: string;
};

/** Carta + dados do utilizador (quantidade, wishlist). */
export type OwnedCard = {
  card: CardRow;
  quantity: number;
  wishlist: boolean;
  addedAt: string;
};

export type PriceBasis = "avg30" | "avg7" | "trend" | "avg_sell" | "reverse";

export const BASIS_LABELS: Record<PriceBasis, string> = {
  avg30: "média de 30 dias",
  avg7: "média de 7 dias",
  trend: "tendência",
  avg_sell: "média de venda",
  reverse: "reverse holo (tendência)",
};

type PriceFields = Pick<CardRow, "avg30" | "avg7" | "trend" | "avg_sell" | "reverse_trend">;

/**
 * Valor da carta (EUR): a **média de 30 dias** do Cardmarket. Só se não existir (set muito recente, sem
 * 30 dias de histórico) usa, por ordem, a média de 7 dias, a tendência, a média de venda e o reverse holo.
 * O preço mais baixo («From») NUNCA é usado como valor da carta.
 */
export function referencePrice(c: PriceFields): { value: number | null; basis: PriceBasis | null } {
  const options: [PriceBasis, number | null][] = [
    ["avg30", c.avg30],
    ["avg7", c.avg7],
    ["trend", c.trend],
    ["avg_sell", c.avg_sell],
    ["reverse", c.reverse_trend],
  ];
  for (const [basis, value] of options) if (value != null && value > 0) return { value, basis };
  return { value: null, basis: null };
}

export const cardPrice = (c: PriceFields): number | null => referencePrice(c).value;
