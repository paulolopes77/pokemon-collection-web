/** Mensagem curta e legível para uma resposta HTTP de erro (nunca despeja HTML na interface). */
export function describeHttpFailure(source: string, status: number, body: string): string {
  const gateway = status === 502 || status === 503 || status === 504;
  const looksLikeHtml = /<\s*(!doctype|html|head|body)\b/i.test(body);
  const detail = looksLikeHtml ? "" : body.replace(/\s+/g, " ").trim().slice(0, 120);
  if (gateway) return `${source}: servidor indisponível ou sobrecarregado (HTTP ${status})`;
  if (status === 429) return `${source}: demasiados pedidos (HTTP 429)`;
  return `${source}: HTTP ${status}${detail ? ` (${detail})` : ""}`;
}
