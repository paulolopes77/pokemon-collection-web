"use client";

import { useEffect, useState } from "react";
import { isDark, nextPref, parsePref, THEME_KEY, THEME_LABELS, type ThemePref } from "@/lib/theme";

const ICONS: Record<ThemePref, string> = { system: "◐", light: "☀", dark: "☾" };

function apply(pref: ThemePref) {
  const dark = isDark(pref, window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Alterna entre automático (sistema), claro e escuro; a escolha fica guardada neste navegador. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [pref, setPref] = useState<ThemePref>("system");

  useEffect(() => {
    try {
      setPref(parsePref(localStorage.getItem(THEME_KEY)));
    } catch {
      /* armazenamento indisponível: fica em automático */
    }
  }, []);

  // Em «Auto», acompanha a mudança do tema do sistema.
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  function cycle() {
    const next = nextPref(pref);
    setPref(next);
    try {
      if (next === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignora */
    }
    apply(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className={`btn whitespace-nowrap ${className}`}
      title="Mudar tema (auto / claro / escuro)"
      aria-label={`Tema: ${THEME_LABELS[pref]}. Carregar para mudar.`}
    >
      <span aria-hidden>{ICONS[pref]}</span> {THEME_LABELS[pref]}
    </button>
  );
}
