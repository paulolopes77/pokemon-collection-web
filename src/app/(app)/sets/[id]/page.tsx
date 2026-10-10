import Link from "next/link";
import { notFound } from "next/navigation";
import { SetCardsView } from "@/components/SetCardsView";
import { SyncButton } from "@/components/SyncButton";
import { loadItemsFor } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { setNeedsSync } from "@/lib/sync-rules";
import { cardPrice } from "@/lib/types";
import type { CardRow, SetRow } from "@/lib/types";
import { fillSetPricesAction, syncSetAction } from "../../../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function SetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const setId = decodeURIComponent(id);
  const supabase = await createClient();

  const { data: set } = await supabase.from("sets").select("*").eq("id", setId).maybeSingle();
  if (!set) notFound();
  const s = set as SetRow;

  const { data } = await supabase
    .from("cards")
    .select("*")
    .eq("set_id", setId)
    .order("number_sort", { ascending: true })
    .order("number", { ascending: true })
    .limit(1000);
  const cards = (data ?? []) as CardRow[];
  const items = await loadItemsFor(supabase, cards.map((c) => c.id));
  const quantities = Object.fromEntries(Object.entries(items).map(([cid, i]) => [cid, i.quantity]));
  const wishlists = Object.fromEntries(Object.entries(items).map(([cid, i]) => [cid, i.wishlist]));

  const oldest = cards.reduce<string | null>((m, c) => (m === null || c.fetched_at < m ? c.fetched_at : m), null);
  const needsSync = setNeedsSync(cards.length, s.total, oldest);
  const missingPrices = cards.filter((c) => cardPrice(c) == null).length;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/sets" className="text-sm text-zinc-500 underline">← Sets</Link>
          <h1 className="text-xl font-semibold">{s.name}</h1>
          <p className="text-xs text-zinc-500">{s.series} · {s.release_date}</p>
        </div>
        <SyncButton
          action={syncSetAction.bind(null, setId)}
          autoAction={needsSync ? undefined : fillSetPricesAction.bind(null, setId)}
          label="Atualizar cartas e preços"
          auto={needsSync || missingPrices > 0}
        />
      </div>
      {cards.length === 0 ? (
        <p className="py-10 text-center text-zinc-500">A carregar cartas da Pokémon TCG API…</p>
      ) : (
        <SetCardsView cards={cards} quantities={quantities} wishlists={wishlists} missingPrices={missingPrices} />
      )}
    </>
  );
}
