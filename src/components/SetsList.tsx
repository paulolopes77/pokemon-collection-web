"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { filterSets, seriesOptions, yearOptions } from "@/lib/sets-filter";
import type { SetRow } from "@/lib/types";

export function SetsList({ sets, owned }: { sets: SetRow[]; owned: Record<string, number> }) {
  const [query, setQuery] = useState("");
  const [series, setSeries] = useState("");
  const [year, setYear] = useState("");
  const [onlyOwned, setOnlyOwned] = useState(false);

  const seriesList = useMemo(() => seriesOptions(sets), [sets]);
  const years = useMemo(() => yearOptions(sets), [sets]);
  const visible = useMemo(
    () => filterSets(sets, { query, series, year, onlyOwned }, owned),
    [sets, owned, query, series, year, onlyOwned],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Também procura pelo nome da série, apesar de o campo dizer só «set». */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Procurar por SET"
          aria-label="Procurar por set"
          className="input w-44"
        />
        <select value={series} onChange={(e) => setSeries(e.target.value)} aria-label="Filtrar por série" className="input w-auto max-w-[14rem]">
          <option value="">Todas as séries</option>
          {seriesList.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Filtrar por ano" className="input w-auto">
          <option value="">Todos os anos</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyOwned} onChange={(e) => setOnlyOwned(e.target.checked)} />
          Só os meus
        </label>
        <span className="ml-auto text-xs text-zinc-500">{visible.length} sets</span>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((s) => {
          const n = owned[s.id] ?? 0;
          return (
            <li key={s.id}>
              <Link
                href={`/sets/${encodeURIComponent(s.id)}`}
                className="flex h-full items-center gap-3 rounded-xl border border-zinc-300 bg-white/90 p-3 shadow-sm transition hover:border-zinc-400 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/85 dark:hover:border-zinc-500"
              >
                {s.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logo_url} alt="" loading="lazy" className="h-12 w-24 shrink-0 object-contain" />
                ) : (
                  <span className="h-12 w-24 shrink-0" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {s.series} · {s.release_date}
                  </span>
                  {s.total > 0 && (
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700">
                      <span className="block h-full bg-brand" style={{ width: `${Math.min(100, (n / s.total) * 100)}%` }} />
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {n}/{s.total}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && <p className="py-6 text-center text-zinc-500">Nenhum set encontrado.</p>}
    </div>
  );
}
