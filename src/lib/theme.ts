export type ThemePref = "system" | "light" | "dark";

export const THEME_KEY = "theme";
export const THEME_ORDER: ThemePref[] = ["system", "light", "dark"];
export const THEME_LABELS: Record<ThemePref, string> = {
  system: "Auto",
  light: "Claro",
  dark: "Escuro",
};

export function parsePref(raw: string | null | undefined): ThemePref {
  return raw === "light" || raw === "dark" ? raw : "system";
}

/** O tema efetivo (true = escuro) para uma preferência e o tema do sistema. */
export function isDark(pref: ThemePref, systemDark: boolean): boolean {
  return pref === "dark" || (pref === "system" && systemDark);
}

export function nextPref(pref: ThemePref): ThemePref {
  return THEME_ORDER[(THEME_ORDER.indexOf(pref) + 1) % THEME_ORDER.length];
}

/**
 * Corre no <head> antes de desenhar a página, para não haver «flash» do tema errado.
 * Tem de ser equivalente a isDark(parsePref(localStorage), prefers-color-scheme: dark).
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}');var d=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
