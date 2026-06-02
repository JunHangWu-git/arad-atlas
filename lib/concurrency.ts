/**
 * Runs `fn` over every item with at most `limit` tasks in flight concurrently.
 * Results are returned in the same order as `items`.
 * The pool does NOT abort on rejection — callers should make `fn` non-throwing
 * (wrap snapshotCharacter in try/catch before passing it in) so per-item errors
 * are surfaced through the result value rather than a thrown exception.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }

  const poolSize = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: poolSize }, worker));

  return results;
}
