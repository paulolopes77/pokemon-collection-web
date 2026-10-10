import { cardPrice, type CardRow } from "./types";

export type CardSortKey = "number" | "name" | "hp" | "value";
export type SortDir = "asc" | "desc";

export const CARD_SORT_LABELS: Record<CardSortKey, string> = {
  number: "Número",
  name: "Nome",
  hp: "HP",
  value: "Valor",
};

/** Sentido inicial ao escolher um critério: HP e Valor começam do maior para o menor. */
export const defaultDir = (key: CardSortKey): SortDir => (key === "hp" || key === "value" ? "desc" : "asc");

/** "120" -> 120; cartas sem HP (Treinadores, Energias) -> null. */
export function hpValue(c: Pick<CardRow, "hp">): number | null {
  const n = parseInt(c.hp ?? "", 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Ordena as cartas do set. As cartas sem esse dado (sem HP, sem preço) ficam sempre no fim, qualquer que seja o
 * sentido; em caso de empate mantém a ordem do número da carta.
 */
export function sortCards(cards: CardRow[], key: CardSortKey, dir: SortDir): CardRow[] {
  const sign = dir === "asc" ? 1 : -1;
  const byNumber = (a: CardRow, b: CardRow) => a.number_sort - b.number_sort || a.number.localeCompare(b.number, "en", { numeric: true });
  const metric = (c: CardRow): number | string | null =>
    key === "hp" ? hpValue(c) : key === "value" ? cardPrice(c) : key === "name" ? c.name : c.number_sort;

  return [...cards].sort((a, b) => {
    const x = metric(a);
    const y = metric(b);
    if (x == null && y == null) return byNumber(a, b);
    if (x == null) return 1; // sem dado: no fim
    if (y == null) return -1;
    const cmp = typeof x === "string" ? x.localeCompare(String(y), "pt") : x - (y as number);
    return cmp * sign || byNumber(a, b);
  });
}
