// Citation IDs are identities, not positions in a freshly extracted PDF.
// Ambiguous split/merged chunks require review instead of positional reassignment.
export function reconcileRuleChunks({ previousChunks = [], chunks, retiredIds = [] }) {
  const reserved = new Set(retiredIds);
  const previousByKey = new Map();
  const freshByKey = new Map();
  const freshSignatures = new Set();
  const keyOf = (chunk) => JSON.stringify([chunk.source, chunk.section, chunk.title]);
  for (const chunk of previousChunks) {
    if (reserved.has(chunk.id)) throw new Error(`Duplicate or retired rule ID: ${chunk.id}`);
    reserved.add(chunk.id);
    const key = keyOf(chunk);
    previousByKey.set(key, [...(previousByKey.get(key) ?? []), chunk]);
  }
  for (const chunk of chunks) {
    const key = keyOf(chunk);
    const signature = JSON.stringify([key, chunk.text]);
    if (freshSignatures.has(signature)) throw new Error(`Duplicate fresh rule chunk: ${key}`);
    freshSignatures.add(signature);
    freshByKey.set(key, [...(freshByKey.get(key) ?? []), chunk]);
  }
  const assigned = new Map();
  for (const [key, fresh] of freshByKey) {
    const old = previousByKey.get(key) ?? [];
    const unmatchedOld = new Set(old);
    const unmatchedFresh = new Set(fresh);
    for (const candidate of fresh) {
      const matches = [...unmatchedOld].filter((chunk) => chunk.text === candidate.text);
      if (matches.length > 1) throw new Error(`Ambiguous unchanged rule chunks: ${key}`);
      if (matches.length === 1) {
        assigned.set(candidate, matches[0].id);
        unmatchedOld.delete(matches[0]);
        unmatchedFresh.delete(candidate);
      }
    }
    // A unique section/title retains its ID when prose changes; pinned cite()
    // calls then detect that change. Never guess among remaining split chunks.
    if (old.length === 1 && fresh.length === 1 && unmatchedOld.size === 1) {
      assigned.set(fresh[0], old[0].id);
    } else if (unmatchedOld.size > 0 && unmatchedFresh.size > 0) {
      throw new Error(`Ambiguous changed rule chunks: ${key}`);
    }
  }
  const nextOrdinal = new Map();
  for (const id of reserved) {
    const match = /^(.*)-(\d+)$/.exec(id);
    if (match) nextOrdinal.set(match[1], Math.max(nextOrdinal.get(match[1]) ?? 0, Number(match[2]) + 1));
  }
  const reconciled = chunks.map((chunk) => {
    let id = assigned.get(chunk);
    if (id === undefined) {
      const ordinal = nextOrdinal.get(chunk.source) ?? 0;
      id = `${chunk.source}-${String(ordinal).padStart(4, "0")}`;
      nextOrdinal.set(chunk.source, ordinal + 1);
    }
    return { ...chunk, id };
  });
  const liveIds = new Set(reconciled.map(({ id }) => id));
  if (liveIds.size !== reconciled.length) throw new Error("Duplicate reconciled rule IDs");
  return { chunks: reconciled, retiredIds: [...reserved].filter((id) => !liveIds.has(id)).sort() };
}
