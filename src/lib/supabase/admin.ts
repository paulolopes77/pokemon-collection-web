import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave service_role: IGNORA o RLS. Só para escrever a cache partilhada
 * (sets, cartas, preços) a partir do servidor. Nunca importar em componentes de cliente.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta a variável de ambiente SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
