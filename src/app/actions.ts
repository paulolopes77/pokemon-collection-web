"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { validateNewUser, validatePassword } from "@/lib/admin-rules";
import { normalizeCode } from "@/lib/invite";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { fillSetPrices, refreshCard, syncSetCards, syncSets } from "@/lib/sync";

export type ActionResult = { ok: boolean; message?: string; note?: string | null };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada. Entra outra vez.");
  return supabase;
}

const msg = (e: unknown) => errorMessage(e);

export async function adjustQuantity(cardId: string, delta: number): Promise<ActionResult> {
  try {
    if (typeof cardId !== "string" || !cardId || (delta !== 1 && delta !== -1)) throw new Error("Pedido inválido.");
    const supabase = await requireUser();
    const { error } = await supabase.rpc("adjust_quantity", { p_card_id: cardId, p_delta: delta });
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: msg(e) };
  }
}

export async function toggleWishlist(cardId: string): Promise<ActionResult> {
  try {
    if (typeof cardId !== "string" || !cardId) throw new Error("Pedido inválido.");
    const supabase = await requireUser();
    const { error } = await supabase.rpc("toggle_wishlist", { p_card_id: cardId });
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: msg(e) };
  }
}

export async function syncSetsAction(): Promise<ActionResult> {
  try {
    await requireUser();
    const n = await syncSets();
    revalidatePath("/sets");
    return { ok: true, message: `${n} sets atualizados.` };
  } catch (e) {
    return { ok: false, message: msg(e) };
  }
}

const priceSummary = (r: { filled: number; remaining: number }) =>
  `${r.filled} preços preenchidos` + (r.remaining > 0 ? `, ${r.remaining} cartas ainda sem preço` : "");

/**
 * Sincroniza as cartas do set (Pokémon TCG API) e depois preenche os preços em falta com a TCGdex.
 * Se a API principal falhar (ex.: 502), continua com o que já está em cache e tenta a TCGdex na mesma.
 */
export async function syncSetAction(setId: string): Promise<ActionResult> {
  try {
    if (typeof setId !== "string" || !setId) throw new Error("Pedido inválido.");
    await requireUser();

    let head: string;
    let mainError: string | null = null;
    try {
      head = `${await syncSetCards(setId)} cartas sincronizadas`;
    } catch (e) {
      mainError = msg(e);
      head = "Não foi possível atualizar as cartas";
    }

    let fill = "";
    let fillFailed = false;
    try {
      const r = await fillSetPrices(setId, mainError ? 40_000 : 25_000);
      fill = ` · ${priceSummary(r)}${r.note ? ` (${r.note})` : ""}`;
    } catch (e) {
      fillFailed = true;
      fill = ` · preços alternativos falharam (${msg(e)})`;
    }

    revalidatePath(`/sets/${setId}`);
    revalidatePath("/", "layout");
    const text = mainError ? `${head}: ${mainError}${fill}. Tenta novamente daqui a uns minutos.` : `${head}${fill}.`;
    return { ok: !(mainError && fillFailed), message: text };
  } catch (e) {
    return { ok: false, message: msg(e) };
  }
}

/** Só preenche os preços em falta de um set (usado ao abrir um set que já está em cache). */
export async function fillSetPricesAction(setId: string): Promise<ActionResult> {
  try {
    if (typeof setId !== "string" || !setId) throw new Error("Pedido inválido.");
    await requireUser();
    const r = await fillSetPrices(setId, 40_000);
    revalidatePath(`/sets/${setId}`);
    revalidatePath("/", "layout");
    return { ok: true, message: `${priceSummary(r)}${r.note ? ` (${r.note})` : ""}.` };
  } catch (e) {
    return { ok: false, message: msg(e) };
  }
}

export async function refreshCardAction(cardId: string): Promise<ActionResult> {
  try {
    if (typeof cardId !== "string" || !cardId) throw new Error("Pedido inválido.");
    await requireUser();
    const res = await refreshCard(cardId);
    if (!res) return { ok: false, message: "A API não encontrou esta carta." };
    revalidatePath(`/cards/${cardId}`);
    revalidatePath("/", "layout");
    return { ok: true, note: res.note, message: res.note ? `Sem preço disponível. ${res.note}` : "Preço atualizado." };
  } catch (e) {
    return { ok: false, message: msg(e) };
  }
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=" + encodeURIComponent("Email ou password incorretos."));
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Registo com convite: só cria conta quem tiver um código válido gerado por um administrador.
 * A conta é criada já confirmada (o convite faz de verificação), por isso não precisa de email.
 */
export async function signUp(formData: FormData) {
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fail = (text: string): never =>
    redirect(`/register?error=${encodeURIComponent(text)}&code=${encodeURIComponent(code)}`);

  const problem = validateNewUser(email, password);
  if (problem) return fail(problem);

  const admin = createAdminClient();
  const { data: valid, error: rpcError } = await admin.rpc("consume_invite", { p_code: code });
  if (rpcError || valid !== true) {
    await new Promise((r) => setTimeout(r, 800)); // trava tentativas em massa
    return fail("Código de convite inválido, expirado ou já usado.");
  }

  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    await admin.rpc("refund_invite", { p_code: code });
    return fail(/already|registered|exists/i.test(error.message) ? "Este email já tem conta. Entra na página de login." : error.message);
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) redirect("/login?error=" + encodeURIComponent("Conta criada. Entra com o teu email e password."));
  redirect("/");
}

/** Alterar a própria password (sessão iniciada). */
export async function changePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const problem = validatePassword(password, confirm);
  if (problem) redirect("/account?error=" + encodeURIComponent(problem));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/account?error=" + encodeURIComponent(error.message));
  redirect("/account?ok=" + encodeURIComponent("Password alterada."));
}

/**
 * «Esqueci-me da password» por email. Precisa de um servidor de email configurado no Supabase
 * (o de origem só envia para membros da equipa). A resposta é sempre a mesma, exista ou não a conta.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/forgot?error=" + encodeURIComponent("Email inválido."));

  const h = await headers();
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/reset` });
  if (error && (error.status === 429 || /rate limit/i.test(error.message))) {
    redirect("/forgot?error=" + encodeURIComponent("Demasiados pedidos. Tenta novamente daqui a pouco."));
  }
  redirect(
    "/forgot?ok=" +
      encodeURIComponent("Se existir uma conta com esse email, enviámos um link para definir uma nova password. Vê também o spam."),
  );
}
