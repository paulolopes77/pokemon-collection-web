import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Destino do link de recuperação de password enviado por email: inicia sessão e leva a «Conta». */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let failed = true;
  if (code) failed = !!(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) failed = !!(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;

  if (failed) {
    const msg = "O link é inválido ou expirou. Pede um novo (no mesmo navegador em que o pediste).";
    return NextResponse.redirect(`${origin}/forgot?error=${encodeURIComponent(msg)}`);
  }
  return NextResponse.redirect(`${origin}/account?reset=1`);
}
