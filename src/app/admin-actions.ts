"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import { validateNewUser } from "@/lib/admin-rules";
import { errorMessage } from "@/lib/errors";
import { clampInt, generateCode } from "@/lib/invite";
import { createAdminClient } from "@/lib/supabase/admin";

const back = (kind: "ok" | "error", text: string): never =>
  redirect(`/admin/users?${kind}=${encodeURIComponent(text)}`);

/** Cria um utilizador (já confirmado) com email e password. Só administradores. */
export async function createUser(formData: FormData) {
  const admin = await getAdminUser();
  if (!admin) return back("error", "Sem permissão.");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const problem = validateNewUser(email, password);
  if (problem) return back("error", problem);

  const { error } = await createAdminClient().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) return back("error", errorMessage(error));
  revalidatePath("/admin/users");
  return back("ok", `Utilizador ${email} criado.`);
}

/** Apaga um utilizador e, em cascata, a sua coleção. Só administradores; não se pode apagar a si próprio. */
export async function deleteUser(formData: FormData) {
  const admin = await getAdminUser();
  if (!admin) return back("error", "Sem permissão.");

  const id = String(formData.get("id") ?? "");
  if (!id) return back("error", "Pedido inválido.");
  if (id === admin.id) return back("error", "Não podes apagar a tua própria conta.");

  const { error } = await createAdminClient().auth.admin.deleteUser(id);
  if (error) return back("error", errorMessage(error));
  revalidatePath("/admin/users");
  return back("ok", "Utilizador apagado.");
}

/** Cria um código de convite (uso único por omissão). Só administradores. */
export async function createInvite(formData: FormData) {
  const admin = await getAdminUser();
  if (!admin) return back("error", "Sem permissão.");

  const note = String(formData.get("note") ?? "").trim().slice(0, 80);
  const maxUses = clampInt(formData.get("max_uses"), 1, 50, 1);
  const days = clampInt(formData.get("days"), 0, 365, 7);
  const expires_at = days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;

  const { error } = await createAdminClient()
    .from("invite_codes")
    .insert({ code: generateCode(), note, max_uses: maxUses, expires_at, created_by: admin.id });
  if (error) return back("error", errorMessage(error));
  revalidatePath("/admin/users");
  return back("ok", "Convite criado.");
}

export async function deleteInvite(formData: FormData) {
  const admin = await getAdminUser();
  if (!admin) return back("error", "Sem permissão.");
  const code = String(formData.get("code") ?? "");
  if (!code) return back("error", "Pedido inválido.");
  const { error } = await createAdminClient().from("invite_codes").delete().eq("code", code);
  if (error) return back("error", errorMessage(error));
  revalidatePath("/admin/users");
  return back("ok", "Convite apagado.");
}
