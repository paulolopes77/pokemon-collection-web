import { cardPrice, type OwnedCard } from "./types";
import { speciesOf } from "./species";

export type SortMode = "recent" | "name" | "value" | "set";
export type GroupMode = "set" | "pokemon" | "none";

export const SORT_LABELS: Record<SortMode, string> = {
  recent: "Recentes",
  name: "Nome",
  value: "Valor",
  set: "Set",
};
export const GROUP_LABELS: Record<GroupMode, string> = {
  set: "Por set",
  pokemon: "Por Pokémon",
  none: "Sem grupos",
};

export type Header = { kind: "header"; key: string; label: string; cards: number; value: number; collapsed: boolean };
export type Item = { kind: "item"; groupKey: string; row: OwnedCard };
export type Row = Header | Item;

const qty = (c: OwnedCard, wishlist: boolean) => (wishlist ? 1 : c.quantity);
const value = (c: OwnedCard, wishlist: boolean) => (cardPrice(c.card) ?? 0) * qty(c, wishlist);

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

  const groups = new Map<string, { label: string; list: OwnedCard[] }>();
  for (const it of items) {
    const [key, label] =
      mode === "set"
        ? [it.card.set_id || "?", it.card.set_name || "Sem set"]
        : [speciesOf(it.card).toLowerCase(), speciesOf(it.card)];
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
  } else {
    entries.sort((a, b) => a[1].label.toLowerCase().localeCompare(b[1].label.toLowerCase(), "pt"));
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
