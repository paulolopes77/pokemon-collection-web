"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustQuantity, toggleWishlist } from "@/app/actions";
import { eur } from "@/lib/money";

/** Cartão «Na coleção»: quantidade (− n +), a wishlist logo a seguir (barra subtil) e, por baixo, o valor das cópias. */
export function CollectionBox({
  cardId,
  quantity,
  wishlist,
  price,
}: {
  cardId: string;
  quantity: number;
  wishlist: boolean;
  /** Valor de uma cópia (média de 30 dias…); com ele mostra-se o valor das cópias que tens. */
  price: number | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.message ?? "Erro");
      router.refresh();
    });
  }

  return (
    <div className="card-box space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-sm font-medium">Na coleção</span>
        <span className="flex items-center gap-3">
          <button
            className="btn"
            disabled={pending || quantity === 0}
            onClick={() => run(() => adjustQuantity(cardId, -1))}
            aria-label="Remover uma"
          >
            −
          </button>
          <span className="w-6 text-center text-lg font-semibold">{quantity}</span>
          <button className="btn btn-primary" disabled={pending} onClick={() => run(() => adjustQuantity(cardId, 1))} aria-label="Adicionar uma">
            +
          </button>
          <span className="h-6 w-px bg-zinc-300 dark:bg-zinc-700" aria-hidden />
          <button
            className="btn"
            disabled={pending}
            aria-pressed={wishlist}
            onClick={() => run(() => toggleWishlist(cardId))}
            title={wishlist ? "Remover da wishlist" : "Adicionar à wishlist"}
          >
            <span className={wishlist ? "text-red-600" : ""} aria-hidden>
              {wishlist ? "♥" : "♡"}
            </span>{" "}
            Wishlist
          </button>
        </span>
      </div>
      {quantity > 0 && price != null && (
        <p className="text-xs text-zinc-500">Valor das tuas cópias: {eur(price * quantity)}</p>
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
