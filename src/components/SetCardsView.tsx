"use client";

import { useState } from "react";
import { CardTile } from "./CardTile";
import type { CardRow } from "@/lib/types";

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
  const owned = cards.filter((c) => (quantities[c.id] ?? 0) > 0).length;
  const visible = onlyMissing ? cards.filter((c) => (quantities[c.id] ?? 0) === 0) : cards;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          Tens {owned} de {cards.length} cartas
          {missingPrices > 0 && <span className="font-normal text-zinc-500"> · {missingPrices} sem preço</span>}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          Só em falta
        </label>
      </div>
      <div className="card-grid">
        {visible.map((c) => (
          <CardTile key={c.id} card={c} quantity={quantities[c.id] ?? 0} wishlist={wishlists[c.id] ?? false} dimIfMissing showWishlist />
        ))}
      </div>
    </div>
  );
}
