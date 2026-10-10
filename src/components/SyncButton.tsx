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
}: {
  action: () => Promise<ActionResult>;
  label: string;
  auto?: boolean;
  /** Ação a correr automaticamente ao abrir a página (por omissão, a mesma do botão). */
  autoAction?: () => Promise<ActionResult>;
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

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => run()} disabled={pending} className="btn">
        {pending ? "A sincronizar…" : label}
      </button>
      {message && <span className="text-xs text-zinc-500">{message}</span>}
    </div>
  );
}
