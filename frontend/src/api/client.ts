const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/**
 * Performs an HTTP request against the configured API base URL and returns the response body.
 *
 * @param path - The path appended to the API base URL.
 * @param init - Optional fetch init options to merge with default headers.
 * @returns The response body: parsed JSON when the response Content-Type includes `application/json`, otherwise the response text cast to `T`.
 * @throws Error with message `API <status>` when the HTTP response status is not in the 2xx range.
 */
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