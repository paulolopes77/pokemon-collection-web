import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Destino do link de confirmação de email enviado pelo Supabase. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let failed = false;
  if (code) {
    failed = !!(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    failed = !!(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else {
    failed = true;
  }

  if (failed) {
    // O email pode já estar confirmado mesmo que esta sessão não arranque (ex.: link aberto noutro dispositivo).
    const msg = "Não foi possível iniciar sessão com o link. Se confirmaste o email, entra com a tua password.";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  }
  return NextResponse.redirect(`${origin}/`);
}
