import { errorMessage } from "@/lib/errors";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchByName } from "@/lib/pokemontcg";
import { saveCards } from "@/lib/sync";
import { loadItemsFor } from "@/lib/queries";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ cards: [], quantities: {} });

  try {
    const cards = await searchByName(q);
    await saveCards(cards); // fica em cache para poder ser adicionada à coleção
    const items = await loadItemsFor(supabase, cards.map((c) => c.id));
    const quantities = Object.fromEntries(Object.entries(items).map(([id, i]) => [id, i.quantity]));
    const wishlists = Object.fromEntries(Object.entries(items).map(([id, i]) => [id, i.wishlist]));
    return NextResponse.json({ cards, quantities, wishlists });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 502 });
  }
}
