import { NextResponse, type NextRequest } from "next/server";
import { otherLanguageImages } from "@/lib/card-images";
import { createClient } from "@/lib/supabase/server";
import type { CardRow } from "@/lib/types";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

/** Outras imagens (idiomas) da mesma carta, para o carrossel da página da carta. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ images: [] });

  const { data } = await supabase.from("cards").select("number, set_id, set_name").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ images: [] });
  const card = data as Pick<CardRow, "number" | "set_id" | "set_name">;
  const { data: set } = await supabase.from("sets").select("printed_total").eq("id", card.set_id).maybeSingle();

  const images = await otherLanguageImages(card, (set as { printed_total: number } | null)?.printed_total ?? 0);
  return NextResponse.json({ images });
}
