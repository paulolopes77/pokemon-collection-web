import type { SetRow } from "./types";

export type SetFilters = {
  query: string;
  series: string; // "" = todas
  year: string; // "" = todos
  onlyOwned: boolean;
};

/** Ano de lançamento ("2026/07/17" -> "2026"). */
export const setYear = (s: Pick<SetRow, "release_date">): string => s.release_date.slice(0, 4);

/** Séries existentes, da mais recente (último set lançado) para a mais antiga. */
export function seriesOptions(sets: SetRow[]): string[] {
  const latest = new Map<string, string>();
  for (const s of sets) {
    if (!s.series) continue;
    if ((latest.get(s.series) ?? "") < s.release_date) latest.set(s.series, s.release_date);
  }
  return [...latest.entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([name]) => name);
}

/** Anos existentes, do mais recente para o mais antigo. */
export function yearOptions(sets: SetRow[]): string[] {
  return [...new Set(sets.map(setYear).filter((y) => /^\d{4}$/.test(y)))].sort((a, b) => b.localeCompare(a));
}

/** A pesquisa de texto procura no nome do set E no da série. */
export function filterSets(sets: SetRow[], f: SetFilters, owned: Record<string, number>): SetRow[] {
  const q = f.query.trim().toLowerCase();
  return sets.filter(
    (s) =>
      (!q || s.name.toLowerCase().includes(q) || s.series.toLowerCase().includes(q)) &&
      (!f.series || s.series === f.series) &&
      (!f.year || setYear(s) === f.year) &&
      (!f.onlyOwned || (owned[s.id] ?? 0) > 0),
  );
}
