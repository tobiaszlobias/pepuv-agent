// In-memory cache přežije navigaci v rámci session, sessionStorage přežije reload.
const memCache: Record<string, unknown> = {};

export function getCached<T>(key: string): T | null {
  if (memCache[key] !== undefined) return memCache[key] as T;
  try {
    const raw = sessionStorage.getItem(`cache:${key}`);
    if (raw) {
      const parsed = JSON.parse(raw) as T;
      memCache[key] = parsed;
      return parsed;
    }
  } catch {}
  return null;
}

export function setCached<T>(key: string, value: T): void {
  memCache[key] = value;
  try {
    sessionStorage.setItem(`cache:${key}`, JSON.stringify(value));
  } catch {}
}
