"use client";

import { useMemo, useState } from "react";
import { CardTile } from "./CardTile";
import { eur } from "@/lib/money";
import { cardPrice, type OwnedCard } from "@/lib/types";
import {
  buildRows,
  filterAndSort,
  GROUP_LABELS,
  SORT_LABELS,
  type GroupMode,
  type SortMode,
} from "@/lib/grouping";

export function CollectionView({ items, wishlist }: { items: OwnedCard[]; wishlist: boolean }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [group, setGroup] = useState<GroupMode>("set");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const totals = useMemo(() => {
    const cards = items.reduce((s, i) => s + (wishlist ? 1 : i.quantity), 0);
    const value = items.reduce((s, i) => s + (cardPrice(i.card) ?? 0) * (wishlist ? 1 : i.quantity), 0);
    return { cards, unique: items.length, value };
  }, [items, wishlist]);

  const rows = useMemo(
    () => buildRows(filterAndSort(items, query, sort), group, sort, collapsed, wishlist),
    [items, query, sort, group, collapsed, wishlist],
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
        {wishlist
          ? "Ainda não marcaste nenhuma carta. Abre uma carta e escolhe «Adicionar à wishlist»."
          : "A coleção está vazia. Usa «Sets» ou «Pesquisar» para adicionar cartas."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="card-box">
          <p className="text-2xl font-semibold">{wishlist ? totals.unique : totals.cards}</p>
          <p className="text-xs text-zinc-500">
            {wishlist ? "cartas na wishlist" : `cartas · ${totals.unique} diferentes`}
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
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-zinc-500">Nenhuma carta corresponde ao filtro.</p>
      ) : (
        <div className="card-grid">
          {rows.map((r) =>
            r.kind === "header" ? (
              <button
                key={`h:${r.key}`}
                type="button"
                onClick={() => toggle(r.key)}
                className="col-span-full flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-left dark:bg-zinc-800"
              >
                <span>
                  <span className="block text-sm font-semibold">{r.label}</span>
                  <span className="block text-xs text-zinc-500">
                    {r.cards} cartas · {eur(r.value)}
                  </span>
                </span>
                <span aria-hidden>{r.collapsed ? "▾" : "▴"}</span>
              </button>
            ) : (
              <CardTile key={`c:${r.groupKey}|${r.row.card.id}`} card={r.row.card} quantity={r.row.quantity} showAdd={!wishlist} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
