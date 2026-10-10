"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/actions";

/** Botão que corre uma Server Action de sincronização (e opcionalmente corre-a logo ao abrir a página). */
export function SyncButton({
  action,
  label,
  auto = false,
  autoAction,
  className = "",
}: {
  action: () => Promise<ActionResult>;
  label: string;
  auto?: boolean;
  /** Ação a correr automaticamente ao abrir a página (por omissão, a mesma do botão). */
  autoAction?: () => Promise<ActionResult>;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const ran = useRef(false);

  function run(fn: () => Promise<ActionResult> = action) {
    setMessage(null);
    start(async () => {
      const r = await fn();
      setMessage(r.message ?? null);
      router.refresh();
    });
  }

  useEffect(() => {
    if (auto && !ran.current) {
      ran.current = true;
      run(autoAction ?? action);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  // O texto do resultado fica à esquerda do botão, na mesma linha (no telemóvel, por cima). O botão não muda de sítio.
  return (
    <div className={`flex flex-col items-end gap-1 text-right sm:flex-row sm:items-center sm:justify-end sm:gap-3 ${className}`}>
      {message && (
        <span role="status" className="min-w-0 text-xs text-zinc-500 sm:flex-1">
          {message}
        </span>
      )}
      <button type="button" onClick={() => run()} disabled={pending} className="btn shrink-0">
        {pending ? "A sincronizar…" : label}
      </button>
    </div>
  );
}
