const STALE_MS = 24 * 60 * 60 * 1000;

/** O set precisa de sincronizar? (sem cartas, incompleto, ou preços com mais de 24 h) */
export function setNeedsSync(cachedCount: number, setTotal: number, oldestFetch: string | null, now = Date.now()): boolean {
  if (cachedCount === 0 || cachedCount < setTotal) return true;
  return !oldestFetch || now - new Date(oldestFetch).getTime() > STALE_MS;
}
