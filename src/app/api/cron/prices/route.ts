import { errorMessage } from "@/lib/errors";
import { NextResponse, type NextRequest } from "next/server";
import { refreshTracked } from "@/lib/sync";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Cron diário (vercel.json): atualiza os preços das cartas na coleção/wishlist e guarda o histórico. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const result = await refreshTracked(45_000);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errorMessage(e) }, { status: 500 });
  }
}
