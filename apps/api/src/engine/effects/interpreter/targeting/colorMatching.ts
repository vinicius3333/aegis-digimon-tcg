import type { CardColor } from "@aegis/shared";

export interface ColorCandidate {
  id: string;
  colors: readonly CardColor[];
}

function maximumColorMatches(colors: readonly CardColor[], candidates: readonly ColorCandidate[]): number {
  const assigned = new Map<string, CardColor>();
  function augment(color: CardColor, visited: Set<string>): boolean {
    for (const candidate of candidates) {
      if (!candidate.colors.includes(color) || visited.has(candidate.id)) continue;
      visited.add(candidate.id);
      const previous = assigned.get(candidate.id);
      if (previous === undefined || augment(previous, visited)) {
        assigned.set(candidate.id, color);
        return true;
      }
    }
    return false;
  }
  for (const color of colors) augment(color, new Set());
  return assigned.size;
}

/** Keep every player choice that can still fulfill mandatory distinct-color selection. */
export function viableColorCandidates(
  colors: readonly CardColor[],
  candidates: readonly ColorCandidate[],
): ColorCandidate[] {
  const color = colors[0];
  if (color === undefined) return [];
  const required = maximumColorMatches(colors, candidates);
  return candidates.filter(
    (candidate) =>
      candidate.colors.includes(color) &&
      1 +
        maximumColorMatches(
          colors.slice(1),
          candidates.filter((other) => other.id !== candidate.id),
        ) ===
        required,
  );
}
