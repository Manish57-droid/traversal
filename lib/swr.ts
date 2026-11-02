import { mutate } from "swr";

// Client-side cache for `/api/**` GETs (SWR, see components/SWRProvider.tsx).
// A page revisited shows its last data instantly and refreshes it in
// the background, instead of a blank loading state on every visit.
//
// Throws on a non-2xx so an error body is never cached as data — the
// hook's `data` stays undefined and `error` is set instead.
export async function apiFetcher<T = any>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

// The cache lives in memory for the whole tab and survives client-side
// navigation — call this whenever the signed-in user changes (sign in /
// sign out via router.push) so one account's data is never shown to
// the next on a shared computer.
export function clearApiCache() {
  return mutate(() => true, undefined, { revalidate: false });
}
