import { randomBytes } from "node:crypto";

// Sem I, O, 0 e 1 para não haver confusões ao ler/ditar o código.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 10;

/** Código aleatório de 10 caracteres (alfabeto de 32 símbolos, distribuição uniforme). */
export function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (const b of bytes) out += ALPHABET[b & 31];
  return out;
}

/** Aceita "k7m2p-x9qrt", "K7M2P X9QRT"... */
export const normalizeCode = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const formatCode = (c: string): string => (c.length === CODE_LENGTH ? `${c.slice(0, 5)}-${c.slice(5)}` : c);

export type InviteState = "ativo" | "esgotado" | "expirado";

export function inviteState(i: { uses: number; max_uses: number; expires_at: string | null }, now = Date.now()): InviteState {
  if (i.expires_at && new Date(i.expires_at).getTime() <= now) return "expirado";
  if (i.uses >= i.max_uses) return "esgotado";
  return "ativo";
}

export function clampInt(raw: FormDataEntryValue | null, min: number, max: number, fallback: number): number {
  const n = parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
