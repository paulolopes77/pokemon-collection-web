import { CardGallery } from "@/components/CardGallery";
import { cardmarketLink, tcgplayerLink } from "@/lib/market-links";
import type { CardRow } from "@/lib/types";

/** Imagem grande da carta (com sombra) e, por baixo, as ligações para o Cardmarket e o TCGplayer. */
export function CardImagePanel({ card }: { card: Pick<CardRow, "id" | "name" | "image_large" | "image_small" | "cm_url"> }) {
  const cm = cardmarketLink(card);
  return (
    <div className="mt-2 space-y-4">
      <CardGallery cardId={card.id} name={card.name} image={card.image_large || card.image_small} />
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-2 px-8">
        <a
          href={cm.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn text-center shadow-md hover:shadow-lg dark:shadow-black/60"
          title={cm.direct ? "Abrir a carta no Cardmarket" : "Pesquisar a carta no Cardmarket"}
        >
          Cardmarket ↗
        </a>
        <a
          href={tcgplayerLink(card)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn text-center shadow-md hover:shadow-lg dark:shadow-black/60"
          title="Pesquisar a carta no TCGplayer"
        >
          TCGplayer ↗
        </a>
      </div>
    </div>
  );
}
