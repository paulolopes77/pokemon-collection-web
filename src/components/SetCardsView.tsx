"use client";

import { useMemo, useState } from "react";
import { CardTile } from "./CardTile";
import {
  activeFilterCount,
  applyCardFilters,
  filterOptions,
  NO_FILTERS,
  type CardFilters,
  type Option,
} from "@/lib/card-filters";
import type { CardRow } from "@/lib/types";

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs text-zinc-500">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>
    </label>
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

  const options = useMemo(() => filterOptions(cards), [cards]);
  const active = activeFilterCount(filters);
  const set = (key: keyof CardFilters) => (value: string) => setFilters((f) => ({ ...f, [key]: value }));

  const owned = cards.filter((c) => (quantities[c.id] ?? 0) > 0).length;
  const visible = useMemo(() => {
    const filtered = applyCardFilters(cards, filters);
    return onlyMissing ? filtered.filter((c) => (quantities[c.id] ?? 0) === 0) : filtered;
  }, [cards, filters, onlyMissing, quantities]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">
          Tens {owned} de {cards.length} cartas
          {missingPrices > 0 && <span className="font-normal text-zinc-500"> · {missingPrices} sem preço</span>}
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
            Só em falta
          </label>
          <button type="button" className="btn" aria-expanded={open || active > 0} onClick={() => setOpen((o) => !o)}>
            Filtros{active > 0 ? ` (${active})` : ""} {open || active > 0 ? "▴" : "▾"}
          </button>
        </div>
      </div>

      {(open || active > 0) && (
        <div className="card-box space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <FilterSelect label="Pokémon" value={filters.pokemon} options={options.pokemon} onChange={set("pokemon")} />
            <FilterSelect label="Estágio" value={filters.stage} options={options.stage} onChange={set("stage")} />
            <FilterSelect label="Elemento" value={filters.element} options={options.element} onChange={set("element")} />
            <FilterSelect label="Raridade" value={filters.rarity} options={options.rarity} onChange={set("rarity")} />
            <FilterSelect label="Ilustrador" value={filters.artist} options={options.artist} onChange={set("artist")} />
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              A mostrar {visible.length} de {cards.length} cartas
            </span>
            {active > 0 && (
              <button type="button" className="underline" onClick={() => setFilters(NO_FILTERS)}>
                Limpar filtros
              </button>
            )}
          </div>
        </div>
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
