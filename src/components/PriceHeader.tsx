"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshCardAction } from "@/app/actions";

/** Título «Preços Cardmarket» com o botão de atualizar no canto superior direito (e a mensagem do resultado por baixo). */
export function PriceHeader({ cardId, autoRefresh }: { cardId: string; autoRefresh: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const ran = useRef(false);

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
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Preços Cardmarket</h2>
        <button type="button" className="btn px-2 py-1 text-xs" disabled={pending} onClick={refresh}>
          {pending ? "A atualizar…" : "↻ Atualizar preço"}
        </button>
      </div>
      {message && <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>}
    </div>
  );
}
