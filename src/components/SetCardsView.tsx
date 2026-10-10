"use client";

import { useMemo, useState } from "react";
import { CardTile } from "./CardTile";
import { CARD_SORT_LABELS, defaultDir, sortCards, type CardSortKey, type SortDir } from "@/lib/card-sort";
import { FilterPanel } from "./FilterPanel";
import { activeFilterCount, applyCardFilters, filterOptions, NO_FILTERS, type CardFilters } from "@/lib/card-filters";
import type { CardRow } from "@/lib/types";

/** Seta para cima (ascendente) ou para baixo (descendente). */
function DirIcon({ dir }: { dir: SortDir }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {dir === "asc" ? <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" /> : <path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" />}
    </svg>
  );
}

export function SetCardsView({
  cards,
  quantities,
  wishlists,
  missingPrices,
}: {
  cards: CardRow[];
  quantities: Record<string, number>;
  wishlists: Record<string, boolean>;
  missingPrices: number;
}) {
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [filters, setFilters] = useState<CardFilters>(NO_FILTERS);
  const [open, setOpen] = useState(false);
  const [sortKey, setSortKey] = useState<CardSortKey>("number");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const options = useMemo(() => filterOptions(cards, filters), [cards, filters]);
  const active = activeFilterCount(filters);
  const set = (key: keyof CardFilters) => (value: string) => setFilters((f) => ({ ...f, [key]: value }));

  const owned = cards.filter((c) => (quantities[c.id] ?? 0) > 0).length;
  const visible = useMemo(() => {
    const filtered = applyCardFilters(cards, filters);
    const list = onlyMissing ? filtered.filter((c) => (quantities[c.id] ?? 0) === 0) : filtered;
    return sortCards(list, sortKey, sortDir);
  }, [cards, filters, onlyMissing, quantities, sortKey, sortDir]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">
          Tens {owned} de {cards.length} cartas
          {missingPrices > 0 && <span className="font-normal text-zinc-500"> · {missingPrices} sem preço</span>}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <label className="flex items-center gap-1.5 text-sm">
              Ordenar
              <select
                value={sortKey}
                onChange={(e) => {
                  const key = e.target.value as CardSortKey;
                  setSortKey(key);
                  setSortDir(defaultDir(key));
                }}
                className="input w-auto py-1.5"
              >
                {(Object.keys(CARD_SORT_LABELS) as CardSortKey[]).map((k) => (
                  <option key={k} value={k}>
                    {CARD_SORT_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn px-2 py-1.5"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              aria-label={sortDir === "asc" ? "Ordem ascendente (clicar para descendente)" : "Ordem descendente (clicar para ascendente)"}
              title={sortDir === "asc" ? "Ascendente" : "Descendente"}
            >
              <DirIcon dir={sortDir} />
            </button>
          </span>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
            Só em falta
          </label>
          {active > 0 && (
            <button type="button" className="btn" onClick={() => setFilters(NO_FILTERS)}>
              ✕ Limpar filtros
            </button>
          )}
          <button type="button" className="btn" aria-expanded={open || active > 0} onClick={() => setOpen((o) => !o)}>
            Filtros{active > 0 ? ` (${active})` : ""} {open || active > 0 ? "▴" : "▾"}
          </button>
        </div>
      </div>

      {(open || active > 0) && (
        <FilterPanel options={options} filters={filters} onChange={(k, v) => set(k)(v)} shown={visible.length} total={cards.length} />
      )}

      {visible.length === 0 ? (
        <p className="py-10 text-center text-zinc-500">Nenhuma carta corresponde aos filtros.</p>
      ) : (
        <div className="card-grid">
          {visible.map((c) => (
            <CardTile key={c.id} card={c} quantity={quantities[c.id] ?? 0} wishlist={wishlists[c.id] ?? false} dimIfMissing showWishlist />
          ))}
        </div>
      )}
    </div>
  );
}
