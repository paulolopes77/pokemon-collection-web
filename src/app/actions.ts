"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { refreshCard, syncSetCards, syncSets } from "@/lib/sync";

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

export async function syncSetAction(setId: string): Promise<ActionResult> {
  try {
    if (typeof setId !== "string" || !setId) throw new Error("Pedido inválido.");
    await requireUser();
    const n = await syncSetCards(setId);
    revalidatePath(`/sets/${setId}`);
    revalidatePath("/", "layout");
    return { ok: true, message: `${n} cartas sincronizadas.` };
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
