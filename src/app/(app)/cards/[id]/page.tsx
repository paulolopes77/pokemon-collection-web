import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionBox } from "@/components/CollectionBox";
import { PriceHeader } from "@/components/PriceHeader";
import { CardImagePanel } from "@/components/CardImagePanel";
import { CardTextPanel } from "@/components/CardTextPanel";
import { SyncButton } from "@/components/SyncButton";
import { hasCardText } from "@/lib/energy";
import { PriceChart, type PricePoint } from "@/components/PriceChart";
import { eur } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { loadSetTextAction } from "@/app/actions";
import { BASIS_LABELS, referencePrice, type CardRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cardId = decodeURIComponent(id);
  const supabase = await createClient();

  const { data } = await supabase.from("cards").select("*").eq("id", cardId).maybeSingle();
  if (!data) notFound();
  const card = data as CardRow;

  const [{ data: item }, { data: history }] = await Promise.all([
    supabase.from("collection_items").select("quantity, wishlist").eq("card_id", cardId).maybeSingle(),
    supabase.from("card_prices").select("day, avg30, avg7, trend, avg_sell").eq("card_id", cardId).order("day", { ascending: true }).limit(365),
  ]);
  const quantity = (item as { quantity: number } | null)?.quantity ?? 0;
  const wishlist = (item as { wishlist: boolean } | null)?.wishlist ?? false;
  const { value: price, basis } = referencePrice(card);

  const points: PricePoint[] = ((history ?? []) as { day: string; avg30: number | null; avg7: number | null; trend: number | null; avg_sell: number | null }[])
    .map((h) => ({ day: h.day, value: h.avg30 ?? h.avg7 ?? h.trend ?? h.avg_sell }))
    .filter((p): p is PricePoint => p.value != null);

  const rows: [string, number | null][] = [
    ["Média 30 dias", card.avg30],
    ["Tendência", card.trend],
    ["Média 7 dias", card.avg7],
    ["Média 1 dia", card.avg1],
    ["Preço mais baixo", card.low],
    ["Média de venda", card.avg_sell],
    ["Reverse Holo (tendência)", card.reverse_trend],
  ];
  const info = [
    card.supertype,
    card.subtypes,
    card.types,
    card.hp ? `HP ${card.hp}` : "",
    card.artist ? `Ilustrador: ${card.artist}` : "",
  ].filter(Boolean);

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr] xl:grid-cols-[minmax(0,400px)_1fr]">
      <div>
        <Link href={card.set_id ? `/sets/${encodeURIComponent(card.set_id)}` : "/"} className="text-sm text-zinc-500 underline">
          ← {card.set_name || "Voltar"}
        </Link>
        <CardImagePanel card={card} />
      </div>

      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">{card.name}</h1>
          <p className="text-sm text-zinc-500">
            {[card.set_name, `#${card.number}`, card.rarity].filter(Boolean).join(" · ")}
          </p>
          {info.length > 0 && <p className="mt-1 text-xs">{info.join(" · ")}</p>}
        </div>

        <CollectionBox cardId={card.id} quantity={quantity} wishlist={wishlist} />
        {quantity > 0 && price != null && (
          <p className="text-sm text-zinc-500">Valor das tuas cópias: {eur(price * quantity)}</p>
        )}

        {hasCardText(card.card_text) ? (
          <CardTextPanel text={card.card_text!} />
        ) : card.set_id && card.card_text == null ? (
          <section className="card-box space-y-2">
            <h2 className="font-semibold">Carta</h2>
            <SyncButton action={loadSetTextAction.bind(null, card.set_id)} label="Carregar texto da carta" auto />
            <p className="text-xs text-zinc-500">Em inglês, a partir do catálogo da Pokémon TCG.</p>
          </section>
        ) : null}

        <section className="card-box space-y-1">
          <PriceHeader cardId={card.id} autoRefresh={price == null} />
          {price != null && (
            <p className="text-sm">
              Valor da carta: <strong>{eur(price)}</strong>{" "}
              <span className="text-zinc-500">
                ({basis === "avg30" ? BASIS_LABELS.avg30 : `${BASIS_LABELS[basis!]} — ainda sem média de 30 dias`})
              </span>
            </p>
          )}
          {rows.every(([, v]) => v == null) ? (
            <p className="text-sm">Sem preço disponível nas duas APIs gratuitas (sets muito recentes demoram a ter preços).</p>
          ) : (
            rows
              .filter(([, v]) => v != null)
              .map(([label, v]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span>{eur(v)}</span>
                </div>
              ))
          )}
          <p className="pt-1 text-xs text-zinc-500">
            Obtido: {new Date(card.fetched_at).toLocaleString("pt-PT")}
            {card.cm_updated_at ? ` · Cardmarket: ${card.cm_updated_at}` : ""}
            {card.price_source ? ` · fonte: ${card.price_source === "tcgdex" ? "TCGdex" : "Pokémon TCG API"}` : ""}
          </p>
        </section>

        <section className="card-box space-y-2">
          <h2 className="font-semibold">Evolução do valor (média de 30 dias)</h2>
          <PriceChart points={points} />
        </section>

      </div>
    </div>
  );
}
