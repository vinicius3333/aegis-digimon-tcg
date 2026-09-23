/** Remove actions while preserving a caller-defined failure. */
export async function minimizeSequence<T>(
  actions: readonly T[],
  reproduces: (candidate: readonly T[]) => Promise<boolean>,
  maxAttempts = 64,
): Promise<T[]> {
  let current = [...actions];
  let chunks = 2;
  let attempts = 0;
  while (current.length > 0 && attempts < maxAttempts) {
    const size = Math.ceil(current.length / chunks);
    let reduced = false;
    for (let start = 0; start < current.length && attempts < maxAttempts; start += size) {
      const candidate = [...current.slice(0, start), ...current.slice(start + size)];
      attempts++;
      if (await reproduces(candidate)) {
        current = candidate;
        chunks = Math.max(2, chunks - 1);
        reduced = true;
        break;
      }
    }
    if (reduced) continue;
    if (chunks >= current.length) break;
    chunks = Math.min(current.length, chunks * 2);
  }
  return current;
}
