"use client";

import { useMemo, useState } from "react";
import { CardTile } from "./CardTile";
import { FilterPanel } from "./FilterPanel";
import { eur, int } from "@/lib/money";
import { cardPrice, type OwnedCard } from "@/lib/types";
import { activeFilterCount, filterOptions, matchesFilters, NO_FILTERS, type CardFilters } from "@/lib/card-filters";
import {
  buildRows,
  filterAndSort,
  GROUP_LABELS,
  isDuplicate,
  SORT_LABELS,
  type GroupMode,
  type SortMode,
} from "@/lib/grouping";

export function CollectionView({ items, wishlist, readOnly = false }: { items: OwnedCard[]; wishlist: boolean; readOnly?: boolean }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [group, setGroup] = useState<GroupMode>("set");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [filters, setFilters] = useState<CardFilters>(NO_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);

  const totals = useMemo(() => {
    const cards = items.reduce((s, i) => s + (wishlist ? 1 : i.quantity), 0);
    const value = items.reduce((s, i) => s + (cardPrice(i.card) ?? 0) * (wishlist ? 1 : i.quantity), 0);
    return { cards, unique: items.length, value };
  }, [items, wishlist]);

  // Pesquisa de texto + ordenação; as opções dos filtros calculam-se sobre o que a pesquisa deixa ver.
  const sorted = useMemo(() => filterAndSort(items, query, sort), [items, query, sort]);
  // «Repetidas»: só as cartas de que tens mais do que uma cópia (só na coleção; na wishlist não há quantidades).
  const queried = useMemo(() => (onlyDuplicates ? sorted.filter(isDuplicate) : sorted), [sorted, onlyDuplicates]);
  const duplicateCount = useMemo(() => items.filter(isDuplicate).length, [items]);
  const options = useMemo(() => filterOptions(queried.map((i) => i.card), filters), [queried, filters]);
  const visible = useMemo(() => queried.filter((i) => matchesFilters(i.card, filters)), [queried, filters]);
  const active = activeFilterCount(filters) + (onlyDuplicates ? 1 : 0);
  const clearAll = () => {
    setFilters(NO_FILTERS);
    setOnlyDuplicates(false);
  };

  const rows = useMemo(
    () => buildRows(visible, group, sort, collapsed, wishlist),
    [visible, group, sort, collapsed, wishlist],
  );

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-zinc-500">
        {readOnly
          ? "Esta coleção ainda não tem cartas."
          : wishlist
          ? "Ainda não marcaste nenhuma carta. Abre uma carta e escolhe «Adicionar à wishlist»."
          : "A coleção está vazia. Usa «Sets» ou «Pesquisar» para adicionar cartas."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="card-box">
          <p className="text-2xl font-semibold">{int(wishlist ? totals.unique : totals.cards)}</p>
          <p className="text-xs text-zinc-500">
            {wishlist ? "cartas na wishlist" : `cartas · ${int(totals.unique)} diferentes`}
          </p>
        </div>
        <div className="card-box">
          <p className="text-2xl font-semibold">{eur(totals.value)}</p>
          <p className="text-xs text-zinc-500">{wishlist ? "custo estimado" : "valor estimado"} (Cardmarket)</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar por carta ou set"
          className="input min-w-[12rem] flex-1"
        />
        <label className="text-sm">
          Ordenar{" "}
          <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} className="input inline-block w-auto">
            {Object.entries(SORT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Agrupar{" "}
          <select value={group} onChange={(e) => setGroup(e.target.value as GroupMode)} className="input inline-block w-auto">
            {Object.entries(GROUP_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        {!wishlist && (
          <label className={`flex items-center gap-2 text-sm ${duplicateCount === 0 ? "opacity-50" : ""}`} title="Cartas de que tens mais do que uma cópia">
            <input
              type="checkbox"
              checked={onlyDuplicates}
              disabled={duplicateCount === 0}
              onChange={(e) => setOnlyDuplicates(e.target.checked)}
            />
            Repetidas ({int(duplicateCount)})
          </label>
        )}
        {active > 0 && (
          <button type="button" className="btn" onClick={clearAll}>
            ✕ Limpar filtros
          </button>
        )}
        <button type="button" className="btn" aria-expanded={showFilters || active > 0} onClick={() => setShowFilters((o) => !o)}>
          Filtros{active > 0 ? ` (${active})` : ""} {showFilters || active > 0 ? "▴" : "▾"}
        </button>
      </div>

      {(showFilters || active > 0) && (
        <FilterPanel
          options={options}
          filters={filters}
          onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          shown={visible.length}
          total={queried.length}
        />
      )}

      {rows.length === 0 ? (
        <p className="py-10 text-center text-zinc-500">Nenhuma carta corresponde aos filtros.</p>
      ) : (
        <div className="card-grid">
          {rows.map((r) =>
            r.kind === "header" ? (
              <button
                key={`h:${r.key}`}
                type="button"
                onClick={() => toggle(r.key)}
                className="col-span-full flex items-center justify-between rounded-lg border border-zinc-400 bg-white px-3 py-2 text-left shadow-sm hover:bg-zinc-50 dark:border-zinc-500 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              >
                <span>
                  <span className="block text-sm font-semibold">{r.label}</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-300">
                    {int(r.cards)} cartas · {eur(r.value)}
                  </span>
                </span>
                <span aria-hidden>{r.collapsed ? "▾" : "▴"}</span>
              </button>
            ) : (
              <CardTile key={`c:${r.groupKey}|${r.row.card.id}`} card={r.row.card} quantity={r.row.quantity} showAdd={!wishlist && !readOnly} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
