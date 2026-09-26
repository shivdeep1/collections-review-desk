export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: options.method || 'GET',
    credentials: 'same-origin',
    signal: options.signal,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || `Request failed (${response.status}).`);
  return result;
}
