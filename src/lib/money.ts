const fmt = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export function eur(v: number | null | undefined): string {
  return v == null ? "—" : fmt.format(v);
}
