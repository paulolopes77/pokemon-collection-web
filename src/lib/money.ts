const NBSP = " ";

/** "1234567" -> "1 234 567" (espaço fixo, para o número não quebrar a meio). */
export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** Montante em euros com separador de milhares em espaço e vírgula decimal: 1234.5 -> "1 234,50 €". */
export function eur(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const [int, dec] = Math.abs(v).toFixed(2).split(".");
  return `${v < 0 ? "-" : ""}${groupThousands(int)},${dec}${NBSP}€`;
}

/** Número inteiro com separador de milhares em espaço: 12345 -> "12 345". */
export function int(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n < 0 ? "-" : ""}${groupThousands(String(Math.abs(Math.round(n))))}`;
}
