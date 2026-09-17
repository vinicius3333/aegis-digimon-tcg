/* The App Fusion choice as the board can still carry it out.

   The overlay stays mounted when its routes go stale, so the player sees why the action
   disappeared rather than watching it vanish; an empty route list is what disables
   confirmation. */

import type { Permanent, PlayerState } from "@aegis/shared";
import { appFusionRoutesForHost } from "../../digivolveModel";
import type { AppFusionRoute } from "../../AppFusionChoiceOverlay";
import type { HandEntry } from "../../piece";
import type { AppFusionChoice } from "../types";

export function appFusionLive({
  choice,
  handEntries,
  viewer,
  available,
}: {
  choice: AppFusionChoice | null;
  handEntries: HandEntry[];
  viewer: PlayerState;
  /** The Main-phase guard: a blocked board can show the choice but not send it. */
  available: boolean;
}):
  | {
      entry: HandEntry | undefined;
      host: Permanent | undefined;
      routes: AppFusionRoute[];
      normalEvolutionLegal: boolean;
    }
  | undefined {
  if (!choice) return undefined;
  const entry = handEntries.find((candidate) => candidate.instanceId === choice.handInstanceId);
  const host = viewer.battleArea.find((candidate) => candidate.permanentId === choice.hostPermanentId);
  const usable = entry !== undefined && host !== undefined && available;
  return {
    entry,
    host,
    routes: usable ? appFusionRoutesForHost(entry.appFusionRoutes ?? [], host) : [],
    normalEvolutionLegal: usable && entry.digivolveTargetPermanentIds.includes(host.permanentId),
  };
}
