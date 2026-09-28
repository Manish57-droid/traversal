// PostgREST (Supabase's REST layer) caps every unpaginated select at
// 1000 rows regardless of how large the table actually is — a plain
// `.select()` on a 3000+ row table silently truncates with no error.
// This loops `.range()` until a page comes back short, accumulating
// every row. `buildQuery` must return a FRESH query each call (apply
// whatever filters, then .range(from, to)) since a Supabase query
// builder can't be re-awaited after its first execution.
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
