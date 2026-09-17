/* The cards a target selection currently offers, which is what the mask lights.

   Every id here is a server projection read back off the board — the attack targets the
   server listed for the chosen attacker, and the bases it listed for the chosen hand
   card. Only the tap flows arm the mask: a drag already carries its own ghost and
   outlined drop areas, and a second dark pass over that would be noise. The breeding step
   keeps its own dim. */

import type { Permanent, PlayerState } from "@aegis/shared";
import type { HandEntry } from "../../piece";
import { spotlightIds } from "./spotlightIds";
import type { LinkDeclaration } from "../types";

export function spotlightRequest({
  breedingWindow,
  linkSel,
  selPerm,
  attackerPerm,
  vortexMode,
  handSel,
  handIsDigi,
  viewer,
  handEntries,
  canAttackSecurity,
}: {
  breedingWindow: boolean;
  linkSel: LinkDeclaration | null;
  selPerm: string | null;
  attackerPerm: Permanent | undefined;
  vortexMode: boolean;
  handSel: string | null;
  handIsDigi: boolean;
  viewer: PlayerState;
  handEntries: HandEntry[];
  canAttackSecurity: boolean;
}) {
  const ids = spotlightIds({
    breedingWindow,
    linkSel,
    selPerm,
    attackerPerm,
    vortexMode,
    handSel,
    handIsDigi,
    you: viewer,
    handEntries,
  });
  const attacker = !breedingWindow ? (selPerm ?? undefined) : undefined;
  return { ids, attacker, security: !!attacker && canAttackSecurity, open: ids.length > 0 || !!attacker };
}
