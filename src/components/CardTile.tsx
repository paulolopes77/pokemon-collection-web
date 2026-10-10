"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { adjustQuantity, toggleWishlist } from "@/app/actions";
import { eur } from "@/lib/money";
import { cardPrice, type CardRow } from "@/lib/types";

export function CardTile({
  card,
  quantity,
  wishlist = false,
  dimIfMissing = false,
  showAdd = true,
  showWishlist = false,
}: {
  card: CardRow;
  quantity: number;
  wishlist?: boolean;
  dimIfMissing?: boolean;
  showAdd?: boolean;
  showWishlist?: boolean;
}) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(!card.image_small);
  const [error, setError] = useState<string | null>(null);
  const [wished, setWished] = useState(wishlist);
  useEffect(() => setWished(wishlist), [wishlist]);
  const [qty, setQty] = useState(quantity);
  useEffect(() => setQty(quantity), [quantity]);

  function add() {
    setError(null);
    setQty((q) => q + 1); // otimista
    start(async () => {
      const r = await adjustQuantity(card.id, 1);
      if (!r.ok) {
        setQty((q) => Math.max(0, q - 1));
        setError(r.message ?? "Erro");
      }
    });
  }

  function wish() {
    setError(null);
    const before = wished;
    setWished(!before); // otimista
    start(async () => {
      const r = await toggleWishlist(card.id);
      if (!r.ok) {
        setWished(before);
        setError(r.message ?? "Erro");
      }
    });
  }

  const round =
    "pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lg shadow disabled:opacity-50 dark:bg-zinc-800/90";

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
              className={`h-full w-full object-contain ${dimIfMissing && qty === 0 ? "opacity-35" : ""}`}
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

      {/* Camada sobre a imagem da carta (não apanha cliques fora dos botões) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[245/342]">
        {qty > 0 && (
          <span className="absolute left-1 top-1 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">×{qty}</span>
        )}
        {showWishlist && (
          <button
            type="button"
            onClick={wish}
            disabled={pending}
            aria-pressed={wished}
            aria-label={wished ? `Remover ${card.name} da wishlist` : `Adicionar ${card.name} à wishlist`}
            title={wished ? "Na wishlist" : "Adicionar à wishlist"}
            className={`${round} absolute bottom-1 left-1 ${wished ? "text-red-600" : "text-zinc-600 dark:text-zinc-300"}`}
          >
            <span aria-hidden>{wished ? "♥" : "♡"}</span>
          </button>
        )}
        {showAdd && (
          <button
            type="button"
            onClick={add}
            disabled={pending}
            aria-label={`Adicionar ${card.name}`}
            title="Adicionar à coleção"
            className={`${round} absolute bottom-1 right-1`}
          >
            +
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
