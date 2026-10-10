"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SetRow } from "@/lib/types";

export function SetsList({ sets, owned }: { sets: SetRow[]; owned: Record<string, number> }) {
  const [query, setQuery] = useState("");
  const [onlyOwned, setOnlyOwned] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sets.filter(
      (s) =>
        (!q || s.name.toLowerCase().includes(q) || s.series.toLowerCase().includes(q)) &&
        (!onlyOwned || (owned[s.id] ?? 0) > 0),
    );
  }, [sets, owned, query, onlyOwned]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Procurar set ou série"
          className="input min-w-[12rem] flex-1"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyOwned} onChange={(e) => setOnlyOwned(e.target.checked)} />
          Só os meus
        </label>
      </div>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {visible.map((s) => {
          const n = owned[s.id] ?? 0;
          return (
            <li key={s.id}>
              <Link href={`/sets/${encodeURIComponent(s.id)}`} className="flex items-center gap-3 py-2">
                {s.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logo_url} alt="" loading="lazy" className="h-11 w-24 object-contain" />
                ) : (
                  <span className="h-11 w-24" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block text-xs text-zinc-500">
                    {s.series} · {s.release_date}
                  </span>
                  {s.total > 0 && (
                    <span className="mt-1 block h-1.5 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
                      <span className="block h-full bg-brand" style={{ width: `${Math.min(100, (n / s.total) * 100)}%` }} />
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium">
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
