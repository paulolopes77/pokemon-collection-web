"use client";

import type { CardFilters, Option } from "@/lib/card-filters";
import type { filterOptions } from "@/lib/card-filters";

type Options = ReturnType<typeof filterOptions>;

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

/**
 * Painel dos filtros Pokémon / Estágio / Elemento / Raridade / Ilustrador (igual no set, na coleção e na wishlist).
 * As listas vêm já condicionadas pelos outros filtros (ver filterOptions).
 */
export function FilterPanel({
  options,
  filters,
  onChange,
  shown,
  total,
  unit = "cartas",
}: {
  options: Options;
  filters: CardFilters;
  onChange: (key: keyof CardFilters, value: string) => void;
  shown: number;
  total: number;
  unit?: string;
}) {
  return (
    <div className="card-box space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <FilterSelect label="Pokémon" value={filters.pokemon} options={options.pokemon} onChange={(v) => onChange("pokemon", v)} />
        <FilterSelect label="Estágio" value={filters.stage} options={options.stage} onChange={(v) => onChange("stage", v)} />
        <FilterSelect label="Elemento" value={filters.element} options={options.element} onChange={(v) => onChange("element", v)} />
        <FilterSelect label="Raridade" value={filters.rarity} options={options.rarity} onChange={(v) => onChange("rarity", v)} />
        <FilterSelect label="Ilustrador" value={filters.artist} options={options.artist} onChange={(v) => onChange("artist", v)} />
      </div>
      <p className="text-xs text-zinc-500">
        A mostrar {shown} de {total} {unit} · as listas só mostram o que existe com os outros filtros escolhidos
      </p>
    </div>
  );
}
