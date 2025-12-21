const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', 'X-User': 'devuser' },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.headers.get('content-type')?.includes('application/json')
    ? res.json()
    : ((await res.text()) as unknown as T);
}
