import type { DecisionRequest } from "@aegis/shared";
import type { DigiXrosCandidate } from "../types";

export type DigiXrosMaterialLimits = NonNullable<DecisionRequest["options"]>["digiXrosMaterialLimits"];

export function fitsDigiXrosMaterialLimits(picks: string[], limits: DigiXrosMaterialLimits): boolean {
  return (
    limits?.every(
      ({ candidateInstanceIds, max }) => picks.filter((id) => candidateInstanceIds.includes(id)).length <= max,
    ) ?? true
  );
}

/** Drop picks whose zone limit shrank below their position (e.g. an expander was un-suspended). */
export function pruneDigiXrosPicksForZoneLimits({
  picks,
  lockedCandidates,
  trashMax,
  underTamerMax,
  materialLimits,
}: {
  picks: string[];
  lockedCandidates: DigiXrosCandidate[];
  trashMax: number;
  underTamerMax: number;
  materialLimits?: DigiXrosMaterialLimits;
}): string[] {
  let nextTrash = 0;
  let nextUnderTamer = 0;
  const next: string[] = [];
  for (const id of picks) {
    if (!fitsDigiXrosMaterialLimits([...next, id], materialLimits)) continue;
    const zone = lockedCandidates.find((c) => c.instanceId === id)?.zone;
    if (zone === "trash") {
      if (nextTrash >= trashMax) continue;
      nextTrash++;
    }
    if (zone === "underTamer") {
      if (nextUnderTamer >= underTamerMax) continue;
      nextUnderTamer++;
    }
    next.push(id);
  }
  return next.length === picks.length ? picks : next;
}

/** Toggle one candidate's pick, respecting its zone's cap. */
export function toggleDigiXrosPick({
  picks,
  candidate,
  candidateById,
  trashMax,
  underTamerMax,
  materialLimits,
}: {
  picks: string[];
  candidate: DigiXrosCandidate;
  candidateById: Map<string, DigiXrosCandidate>;
  trashMax: number;
  underTamerMax: number;
  materialLimits?: DigiXrosMaterialLimits;
}): string[] {
  const { instanceId, zone } = candidate;
  if (picks.includes(instanceId)) return picks.filter((id) => id !== instanceId);
  if (!fitsDigiXrosMaterialLimits([...picks, instanceId], materialLimits)) return picks;
  const trashCount = picks.filter((id) => candidateById.get(id)?.zone === "trash").length;
  const underTamerCount = picks.filter((id) => candidateById.get(id)?.zone === "underTamer").length;
  if (zone === "trash" && trashCount >= trashMax) return picks;
  if (zone === "underTamer" && underTamerCount >= underTamerMax) return picks;
  return [...picks, instanceId];
}
