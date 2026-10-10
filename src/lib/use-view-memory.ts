"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Lembra o estado de uma página (filtros, ordenação, grupos…) e a posição do scroll enquanto o separador
 * estiver aberto, para que ao voltar de uma carta (Voltar) a página fique como estava.
 * `state` tem de ser JSON; `restore` recebe o que foi guardado (validar o que lá estiver).
 */
export function useViewMemory<T>(state: T, restore: (saved: Partial<T>) => void) {
  const key = "view:" + usePathname();
  const ready = useRef(false);
  const restoreRef = useRef(restore);
  restoreRef.current = restore;

  // Ao entrar: repõe o estado guardado e depois o scroll.
  useEffect(() => {
    ready.current = false;
    let scrollY = 0;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as { state?: Partial<T>; scrollY?: number };
        if (saved.state) restoreRef.current(saved.state);
        scrollY = saved.scrollY ?? 0;
      }
    } catch {
      /* sem sessionStorage ou dados inválidos: começa do zero */
    }
    ready.current = true;
    if (scrollY > 0) {
      // espera que a lista seja desenhada com os filtros repostos
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, scrollY)));
    }
  }, [key]);

  const latest = useRef(state);
  latest.current = state;

  const write = (extra?: { scrollY: number }) => {
    if (!ready.current) return;
    try {
      const prev = JSON.parse(sessionStorage.getItem(key) ?? "{}") as { scrollY?: number };
      sessionStorage.setItem(key, JSON.stringify({ state: latest.current, scrollY: extra?.scrollY ?? prev.scrollY ?? 0 }));
    } catch {
      /* ignora */
    }
  };

  // Guarda sempre que o estado muda.
  // (não grava o estado inicial por cima do que ainda vai ser reposto)
  const json = JSON.stringify(state);
  const initialJson = useRef(json);
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current && json === initialJson.current) return;
    touched.current = true;
    write();
  }, [json]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guarda o scroll (e ao sair da página).
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => write({ scrollY: window.scrollY }), 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
