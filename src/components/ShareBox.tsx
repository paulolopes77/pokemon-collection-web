"use client";

import { useState, useTransition } from "react";
import { setShare } from "@/app/actions";
import type { Profile } from "@/lib/queries";

/** Caixa «Partilhar»: marca os utilizadores que podem ver (só ver) a minha coleção. */
export function ShareBox({ users, sharedWith }: { users: Profile[]; sharedWith: string[] }) {
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState(() => new Set(sharedWith));
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const visible = users.filter((u) => u.display_name.toLowerCase().includes(filter.trim().toLowerCase()));

  function toggle(id: string, on: boolean) {
    setError(null);
    setShared((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    start(async () => {
      const r = await setShare(id, on);
      if (!r.ok) {
        setError(r.message ?? "Não foi possível guardar.");
        setShared((prev) => {
          const next = new Set(prev);
          if (on) next.delete(id);
          else next.add(id);
          return next;
        });
      }
    });
  }

  return (
    <div className="card-box mb-3">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between text-left">
        <span className="font-semibold">
          Partilhar <span className="font-normal text-zinc-500">· {shared.size === 0 ? "ninguém" : `${shared.size} ${shared.size === 1 ? "utilizador" : "utilizadores"}`} (só leitura)</span>
        </span>
        <span aria-hidden>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-zinc-500">Os utilizadores marcados podem ver a tua coleção, mas não a podem alterar.</p>
          {users.length === 0 ? (
            <p className="text-sm text-zinc-500">Ainda não há outros utilizadores no site.</p>
          ) : (
            <>
              {users.length > 8 && (
                <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Procurar utilizador" className="input" aria-label="Procurar utilizador" />
              )}
              <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((u) => (
                  <li key={u.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <input type="checkbox" checked={shared.has(u.id)} onChange={(e) => toggle(u.id, e.target.checked)} />
                      {u.display_name}
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
