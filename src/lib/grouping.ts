import { artistOf, byOrder, elementLabel, NONE, primaryElement, primaryStage, rarityOf, RARITY_ORDER, STAGE_ORDER } from "./card-filters";
import { hpValue } from "./card-sort";
import { speciesOf } from "./species";
import { cardPrice, type OwnedCard } from "./types";

export type SortMode = "recent" | "name" | "value" | "hp" | "set";
export type GroupMode = "set" | "pokemon" | "rarity" | "element" | "stage" | "artist" | "none";

export const SORT_LABELS: Record<SortMode, string> = {
  recent: "Recentes",
  name: "Nome",
  value: "Valor",
  hp: "HP",
  set: "Set",
};
export const GROUP_LABELS: Record<GroupMode, string> = {
  set: "Por set",
  pokemon: "Por Pokémon",
  rarity: "Por raridade",
  element: "Por elemento",
  stage: "Por estágio",
  artist: "Por ilustrador",
  none: "Sem grupos",
};

export type Header = { kind: "header"; key: string; label: string; cards: number; value: number; collapsed: boolean };
export type Item = { kind: "item"; groupKey: string; row: OwnedCard };
export type Row = Header | Item;

const qty = (c: OwnedCard, wishlist: boolean) => (wishlist ? 1 : c.quantity);
const value = (c: OwnedCard, wishlist: boolean) => (cardPrice(c.card) ?? 0) * qty(c, wishlist);

/** Carta repetida: tens mais do que uma cópia (quantidade superior a 1). */
export const isDuplicate = (i: OwnedCard): boolean => i.quantity > 1;

export function filterAndSort(items: OwnedCard[], query: string, sort: SortMode): OwnedCard[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((i) => i.card.name.toLowerCase().includes(q) || i.card.set_name.toLowerCase().includes(q))
    : [...items];
  switch (sort) {
    case "recent":
      return filtered.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    case "name":
      return filtered.sort((a, b) => a.card.name.localeCompare(b.card.name, "pt"));
    case "value":
      return filtered.sort(
        (a, b) => (cardPrice(b.card) ?? 0) * Math.max(b.quantity, 1) - (cardPrice(a.card) ?? 0) * Math.max(a.quantity, 1),
      );
    case "hp":
      // Do maior para o menor; cartas sem HP (Treinadores, Energias) no fim.
      return filtered.sort((a, b) => {
        const x = hpValue(a.card);
        const y = hpValue(b.card);
        if (x == null && y == null) return a.card.name.localeCompare(b.card.name, "pt");
        if (x == null) return 1;
        if (y == null) return -1;
        return y - x || a.card.name.localeCompare(b.card.name, "pt");
      });
    case "set":
      return filtered.sort(
        (a, b) => a.card.set_name.localeCompare(b.card.set_name, "pt") || a.card.number_sort - b.card.number_sort,
      );
  }
}

/**
 * Converte a lista (já filtrada/ordenada) numa lista plana com cabeçalhos de grupo.
 * A ordem dos grupos segue a ordenação escolhida (valor, recentes) ou o nome do grupo.
 */
export function buildRows(
  items: OwnedCard[],
  mode: GroupMode,
  sort: SortMode,
  collapsed: ReadonlySet<string>,
  wishlist: boolean,
): Row[] {
  if (mode === "none") return items.map((row) => ({ kind: "item", groupKey: "", row }));

  const none = "(sem dados)";
  const keyLabel = (it: OwnedCard): [string, string] => {
    const c = it.card;
    switch (mode) {
      case "set":
        return [c.set_id || "?", c.set_name || "Sem set"];
      case "rarity": {
        const k = rarityOf(c);
        return [k, k === NONE ? none : k];
      }
      case "element": {
        const k = primaryElement(c);
        return [k, k === NONE ? none : elementLabel(k)];
      }
      case "stage": {
        const k = primaryStage(c);
        return [k, k === NONE ? none : k];
      }
      case "artist": {
        const k = artistOf(c);
        return [k, k === NONE ? none : k];
      }
      default:
        return [speciesOf(c).toLowerCase(), speciesOf(c)];
    }
  };

  const groups = new Map<string, { label: string; list: OwnedCard[] }>();
  for (const it of items) {
    const [key, label] = keyLabel(it);
    const g = groups.get(key) ?? { label, list: [] };
    g.list.push(it);
    groups.set(key, g);
  }

  const entries = [...groups.entries()];
  if (sort === "value") {
    const total = (l: OwnedCard[]) => l.reduce((s, c) => s + value(c, wishlist), 0);
    entries.sort((a, b) => total(b[1].list) - total(a[1].list));
  } else if (sort === "recent") {
    const latest = (l: OwnedCard[]) => l.reduce((m, c) => (c.addedAt > m ? c.addedAt : m), "");
    entries.sort((a, b) => latest(b[1].list).localeCompare(latest(a[1].list)));
  } else if (sort === "hp") {
    const top = (l: OwnedCard[]) => l.reduce((m, c) => Math.max(m, hpValue(c.card) ?? -1), -1);
    entries.sort((a, b) => top(b[1].list) - top(a[1].list) || a[1].label.localeCompare(b[1].label, "pt"));
  } else {
    // Ordem natural do critério: raridade e estágio do mais comum para o mais raro; o resto alfabético.
    const natural = (a: string, b: string) => {
      if (a === NONE || b === NONE) return a === NONE ? (b === NONE ? 0 : 1) : -1; // «sem dados» no fim
      if (mode === "rarity") return byOrder(RARITY_ORDER)(a, b);
      if (mode === "stage") return byOrder(STAGE_ORDER)(a, b);
      if (mode === "element") {
        const cat = (v: string) => (v === "Energy" || v === "Trainer" ? 1 : 0); // Energia e Treinador depois dos tipos
        return cat(a) - cat(b);
      }
      return 0;
    };
    entries.sort(
      (a, b) =>
        natural(a[0], b[0]) || a[1].label.toLowerCase().localeCompare(b[1].label.toLowerCase(), "pt"),
    );
  }

  const rows: Row[] = [];
  for (const [key, g] of entries) {
    const isCollapsed = collapsed.has(key);
    rows.push({
      kind: "header",
      key,
      label: g.label,
      cards: g.list.reduce((s, c) => s + qty(c, wishlist), 0),
      value: g.list.reduce((s, c) => s + value(c, wishlist), 0),
      collapsed: isCollapsed,
    });
    if (!isCollapsed) for (const row of g.list) rows.push({ kind: "item", groupKey: key, row });
  }
  return rows;
}
