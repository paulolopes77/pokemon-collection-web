/** Lista de administradores a partir de ADMIN_EMAILS ("a@x.com, b@y.com"). */
export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined, raw: string | undefined = process.env.ADMIN_EMAILS): boolean {
  return !!email && parseAdminEmails(raw).includes(email.trim().toLowerCase());
}

export const MIN_PASSWORD = 8;

export function validateNewUser(email: string, password: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email inválido.";
  if (password.length < MIN_PASSWORD) return `A password deve ter pelo menos ${MIN_PASSWORD} caracteres.`;
  return null;
}

/** Validação de uma password nova (e da sua confirmação, se existir). */
export function validatePassword(password: string, confirm?: string): string | null {
  if (password.length < MIN_PASSWORD) return `A password deve ter pelo menos ${MIN_PASSWORD} caracteres.`;
  if (confirm !== undefined && password !== confirm) return "As passwords não coincidem.";
  return null;
}
