/** Mensagem legível de qualquer erro (inclui os objetos de erro do Supabase, que não são `Error`). */
export function errorMessage(e: unknown, fallback = "Ocorreu um erro inesperado."): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return fallback;
}
