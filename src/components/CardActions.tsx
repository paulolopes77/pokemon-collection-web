"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustQuantity, refreshCardAction, toggleWishlist } from "@/app/actions";

/** Quantidade, wishlist e atualização de preço de uma carta. */
export function CardActions({
  cardId,
  quantity,
  wishlist,
  autoRefresh,
  initialNote,
}: {
  cardId: string;
  quantity: number;
  wishlist: boolean;
  autoRefresh: boolean;
  initialNote?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(initialNote ?? null);
  const ran = useRef(false);

  function adjust(delta: 1 | -1) {
    start(async () => {
      const r = await adjustQuantity(cardId, delta);
      if (!r.ok) setMessage(r.message ?? "Erro");
      router.refresh();
    });
  }

  function refresh() {
    setMessage(null);
    start(async () => {
      const r = await refreshCardAction(cardId);
      setMessage(r.message ?? null);
      router.refresh();
    });
  }

  // Carta sem preço: tenta já a fonte alternativa ao abrir a página.
  useEffect(() => {
    if (autoRefresh && !ran.current) {
      ran.current = true;
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  return (
    <div className="space-y-3">
      <div className="card-box flex items-center justify-between">
        <span className="text-sm font-medium">Na coleção</span>
        <span className="flex items-center gap-3">
          <button className="btn" disabled={pending || quantity === 0} onClick={() => adjust(-1)} aria-label="Remover uma">
            −
          </button>
          <span className="w-6 text-center text-lg font-semibold">{quantity}</span>
          <button className="btn btn-primary" disabled={pending} onClick={() => adjust(1)} aria-label="Adicionar uma">
            +
          </button>
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="btn"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await toggleWishlist(cardId);
              router.refresh();
            })
          }
        >
          {wishlist ? "♥ Na wishlist" : "♡ Adicionar à wishlist"}
        </button>
        <button className="btn" disabled={pending} onClick={refresh}>
          {pending ? "A atualizar…" : "↻ Atualizar preço"}
        </button>
      </div>
      {message && <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>}
    </div>
  );
}
