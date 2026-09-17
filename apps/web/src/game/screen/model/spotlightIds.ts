import type { Permanent, PlayerState } from "@aegis/shared";
import { attackTargetIdsOf } from "../../boardModel";
import type { HandEntry } from "../../piece";
import { eligibleBase } from "./eligibility";

// The cards a target selection currently offers, which is what the mask lights.
// Every id here is a server projection read back off the board — the attack
// targets the server listed for the chosen attacker, and the bases it listed
// for the chosen hand card. Only the tap flows arm the mask: a drag already
// carries its own ghost and outlined drop areas, and a second dark pass over
// that would be noise. The breeding step keeps its own dim (`breedingWindow`).
export function spotlightIds(input: {
  breedingWindow: boolean;
  linkSel: { instanceId: string; cardId: string; targetPermanentIds: readonly string[] } | null;
  selPerm: string | null;
  attackerPerm: Permanent | undefined;
  vortexMode: boolean;
  handSel: string | null;
  handIsDigi: boolean;
  you: PlayerState;
  handEntries: readonly HandEntry[];
}): readonly string[] {
  const { breedingWindow, linkSel, selPerm, attackerPerm, vortexMode, handSel, handIsDigi, you, handEntries } = input;
  if (breedingWindow) return [];
  if (linkSel) return linkSel.targetPermanentIds;
  if (selPerm) return attackTargetIdsOf(attackerPerm, vortexMode);
  if (handSel && handIsDigi)
    return you.battleArea.filter((perm) => eligibleBase({ handEntries, you, handSel, perm })).map((p) => p.permanentId);
  return [];
}
