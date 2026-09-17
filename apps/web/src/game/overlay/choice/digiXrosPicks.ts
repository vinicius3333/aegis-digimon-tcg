import type { DigiXrosCandidate } from "../types";

/** Drop picks whose zone limit shrank below their position (e.g. an expander was un-suspended). */
export function pruneDigiXrosPicksForZoneLimits({
  picks,
  lockedCandidates,
  trashMax,
  underTamerMax,
}: {
  picks: string[];
  lockedCandidates: DigiXrosCandidate[];
  trashMax: number;
  underTamerMax: number;
}): string[] {
  let nextTrash = 0;
  let nextUnderTamer = 0;
  const next = picks.filter((id) => {
    const zone = lockedCandidates.find((c) => c.instanceId === id)?.zone;
    if (zone === "trash") {
      nextTrash += 1;
      return nextTrash <= trashMax;
    }
    if (zone === "underTamer") {
      nextUnderTamer += 1;
      return nextUnderTamer <= underTamerMax;
    }
    return true;
  });
  return next.length === picks.length ? picks : next;
}

/** Toggle one candidate's pick, respecting its zone's cap. */
export function toggleDigiXrosPick({
  picks,
  candidate,
  candidateById,
  trashMax,
  underTamerMax,
}: {
  picks: string[];
  candidate: DigiXrosCandidate;
  candidateById: Map<string, DigiXrosCandidate>;
  trashMax: number;
  underTamerMax: number;
}): string[] {
  const { instanceId, zone } = candidate;
  if (picks.includes(instanceId)) return picks.filter((id) => id !== instanceId);
  const trashCount = picks.filter((id) => candidateById.get(id)?.zone === "trash").length;
  const underTamerCount = picks.filter((id) => candidateById.get(id)?.zone === "underTamer").length;
  if (zone === "trash" && trashCount >= trashMax) return picks;
  if (zone === "underTamer" && underTamerCount >= underTamerMax) return picks;
  return [...picks, instanceId];
}
