/** Same-origin flykit route with the session id and any extra query fields. */
export function api(route: string, sessionId: string, params: Record<string, string> = {}): string {
  const q = new URLSearchParams({ sessionId, ...params })
  return `/api/flykit/${route}?${q}`
}
