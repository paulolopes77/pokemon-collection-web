import type { CardRow } from "./types";

/** Ligação ao Cardmarket: a da carta, se a API a deu; senão, uma pesquisa pelo nome. */
export function cardmarketLink(card: Pick<CardRow, "cm_url" | "name">): { url: string; direct: boolean } {
  if (card.cm_url) return { url: card.cm_url, direct: true };
  return {
    url: `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(card.name)}`,
    direct: false,
  };
}

/** Pesquisa da carta no TCGplayer (mercado dos EUA, preços em USD). */
export function tcgplayerLink(card: Pick<CardRow, "name">): string {
  return `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${encodeURIComponent(card.name)}&view=grid`;
}
