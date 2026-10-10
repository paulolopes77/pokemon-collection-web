import "server-only";
import { IMAGE_LANGUAGES, normalizeNumber, pickTcgdexSet, tcgdexImageUrl, type SetBrief } from "./tcgdex-rules";
import type { CardRow } from "./types";

const ROOT = "https://api.tcgdex.net/v2";

export type AltImage = { lang: string; label: string; url: string };

/** GET com cache de 24 h (as imagens de uma carta não mudam), para não repetir os pedidos a cada visita. */
async function getCached<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${ROOT}${path}`, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(12_000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Outras imagens da mesma carta: a mesma carta nos outros idiomas da TCGdex (pt, es, fr, de, it, ja), quando existirem.
 * Nunca lança erros; sem resultados devolve [].
 */
export async function otherLanguageImages(
  card: Pick<CardRow, "number" | "set_name">,
  printedTotal: number,
): Promise<AltImage[]> {
  const sets = await getCached<SetBrief[]>("/en/sets");
  const setId = sets ? pickTcgdexSet(sets, card.set_name, printedTotal) : null;
  if (!setId) return [];

  const set = await getCached<{ cards?: { id: string; localId?: string }[] }>(`/en/sets/${encodeURIComponent(setId)}`);
  const wanted = normalizeNumber(card.number);
  const tcgdexCardId = set?.cards?.find((c) => normalizeNumber(c.localId ?? "") === wanted)?.id;
  if (!tcgdexCardId) return [];

  const found = await Promise.all(
    IMAGE_LANGUAGES.map(async ({ code, label }) => {
      const full = await getCached<{ image?: string }>(`/${code}/cards/${encodeURIComponent(tcgdexCardId)}`);
      const url = tcgdexImageUrl(full?.image);
      return url ? { lang: code, label, url } : null;
    }),
  );
  return found.filter((x): x is AltImage => x !== null);
}
