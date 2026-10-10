"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { adjustQuantity } from "@/app/actions";
import { eur } from "@/lib/money";
import { cardPrice, type CardRow } from "@/lib/types";

export function CardTile({
  card,
  quantity,
  dimIfMissing = false,
  showAdd = true,
}: {
  card: CardRow;
  quantity: number;
  dimIfMissing?: boolean;
  showAdd?: boolean;
}) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(!card.image_small);
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    start(async () => {
      const r = await adjustQuantity(card.id, 1);
      if (!r.ok) setError(r.message ?? "Erro");
    });
  }

  return (
    <div className="relative">
      <Link href={`/cards/${encodeURIComponent(card.id)}`} className="block">
        <div className="relative aspect-[245/342] overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800">
          {!failed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image_small}
              alt={card.name}
              loading="lazy"
              onError={() => setFailed(true)}
              className={`h-full w-full object-contain ${dimIfMissing && quantity === 0 ? "opacity-35" : ""}`}
            />
          )}
          {failed && (
            <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs">
              {card.name}
              <br />#{card.number}
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-xs font-medium">{card.name}</p>
        <p className="truncate text-[11px] text-zinc-500">
          #{card.number} · {eur(cardPrice(card))}
        </p>
      </Link>
      {quantity > 0 && (
        <span className="absolute left-1 top-1 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">×{quantity}</span>
      )}
      {showAdd && (
        <button
          type="button"
          onClick={add}
          disabled={pending}
          aria-label={`Adicionar ${card.name}`}
          className="absolute right-1 top-[calc(100%-3.6rem)] flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lg shadow disabled:opacity-50 dark:bg-zinc-800/90"
        >
          +
        </button>
      )}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
