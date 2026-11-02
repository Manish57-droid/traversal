"use client";

import { SWRConfig } from "swr";
import { apiFetcher } from "@/lib/swr";

// App-wide SWR defaults, so a page only needs `useSWR("/api/...")`.
// See lib/swr.ts for why this cache exists and how it's cleared.
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ fetcher: apiFetcher }}>{children}</SWRConfig>;
}
