import "server-only";
import { createClient } from "./supabase/server";
import { isAdminEmail } from "./admin-rules";

/** Devolve o utilizador com sessão se for administrador (ADMIN_EMAILS); senão null. */
export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && isAdminEmail(user.email) ? user : null;
}
