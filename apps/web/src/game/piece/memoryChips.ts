/** Total length of the reference client's tab sweep (MemoryObject.cs:113): the marker move. */
export const MEMORY_SWEEP_MS = 200;
export const MEMORY_SWEEP_CHIP_MS = 120;

/**
 * The chips memory passed over on its way to `to`, in travel order and excluding
 * both endpoints. A single-step change traverses nothing, so it sweeps nothing.
 * The bounds are derived rather than stepped to, so no input can outrun the loop.
 */
export function traversedChips(from: number, to: number): number[] {
  const first = Math.floor(Math.min(from, to)) + 1;
  const last = Math.ceil(Math.max(from, to)) - 1;
  const chips: number[] = [];
  for (let v = first; v <= last; v += 1) chips.push(v);
  return to < from ? chips.reverse() : chips;
}
