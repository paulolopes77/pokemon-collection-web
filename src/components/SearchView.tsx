"use client";

import { useState, useTransition } from "react";
import { CardTile } from "./CardTile";
import type { CardRow } from "@/lib/types";

type Result = { cards: CardRow[]; quantities: Record<string, number> };

export function SearchView() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setError(null);
    start(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erro na pesquisa.");
        setResult(json as Result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro na pesquisa.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome da carta (ex.: Charizard)"
          className="input flex-1"
          autoFocus
        />
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "A pesquisar…" : "Pesquisar"}
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {result === null && !error && (
        <p className="py-10 text-center text-zinc-500">Pesquisa uma carta pelo nome para a adicionar à coleção.</p>
      )}
      {result && result.cards.length === 0 && <p className="py-10 text-center text-zinc-500">Sem resultados.</p>}
      {result && result.cards.length > 0 && (
        <div className="card-grid">
          {result.cards.map((c) => (
            <CardTile key={c.id} card={c} quantity={result.quantities[c.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}
