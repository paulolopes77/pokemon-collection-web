/** Regras puras da TCGdex (sem acesso à rede), para poderem ser testadas. */

export const alnum = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
export const normalizeNumber = (n: string) => n.trim().replace(/^0+/, "").toLowerCase();

export function sameSet(a: string, b: string): boolean {
  const x = alnum(a);
  const y = alnum(b);
  return x !== "" && y !== "" && (x === y || x.includes(y) || y.includes(x));
}

export type SetBrief = { id: string; name?: string; cardCount?: { official?: number } };

/** Escolhe o set da TCGdex equivalente ao nosso: pelo nome; senão, pelo n.º oficial de cartas se for único. */
export function pickTcgdexSet(list: SetBrief[], name: string, printedTotal: number): string | null {
  const byName = list.find((s) => sameSet(s.name ?? "", name));
  if (byName) return byName.id;
  if (printedTotal > 0) {
    const byCount = list.filter((s) => s.cardCount?.official === printedTotal);
    if (byCount.length === 1) return byCount[0].id;
  }
  return null;
}


/** Idiomas em que procuramos outras versões da imagem da carta (a original é a inglesa). */
export const IMAGE_LANGUAGES: { code: string; label: string }[] = [
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "日本語" },
];

/** A TCGdex devolve o endereço base da imagem; a qualidade e o formato acrescentam-se no fim. */
export function tcgdexImageUrl(base: string | null | undefined, quality: "low" | "high" = "high"): string | null {
  const b = (base ?? "").trim().replace(/\/+$/, "");
  return /^https:\/\//.test(b) ? `${b}/${quality}.webp` : null;
}
