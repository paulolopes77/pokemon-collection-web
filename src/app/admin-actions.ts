"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import { validateNewUser } from "@/lib/admin-rules";
import { errorMessage } from "@/lib/errors";
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
