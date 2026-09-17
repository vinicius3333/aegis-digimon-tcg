// Every "can I do this?" answer below is the server's, read off the state it already
// projects (CardInstance.digivolveTargetPermanentIds / Permanent.attackablePermanentIds).
// The client renders affordances; it does not re-derive the rules behind them.

import type { Permanent, PlayerState } from "@aegis/shared";
import { appFusionRoutesForHost, type ProjectedDigivolveRoute } from "../../boardModel";
import type { HandEntry } from "../../boardPieces";

export function digivolveTargetsOf(input: {
  handEntries: readonly HandEntry[];
  instanceId: string | undefined;
}): readonly string[] {
  const { handEntries, instanceId } = input;
  return (
    (instanceId
      ? handEntries.find((entry) => entry.instanceId === instanceId)?.digivolveTargetPermanentIds
      : undefined) ?? []
  );
}

/** Server-projected Digimon this battle-area permanent's top card may be linked to. */
export function linkTargetsOfPermanent(input: { isMyTurn: boolean; perm: Permanent }): readonly string[] {
  const { isMyTurn, perm } = input;
  return isMyTurn && perm.topCard ? [...perm.topCard.linkTargetPermanentIds] : [];
}

export function appFusionHostIdsOf(input: {
  handEntries: readonly HandEntry[];
  you: PlayerState;
  instanceId: string | undefined;
}): readonly string[] {
  const { handEntries, you, instanceId } = input;
  const entry = instanceId ? handEntries.find((candidate) => candidate.instanceId === instanceId) : undefined;
  if (!entry) return [];
  return you.battleArea
    .filter((host) => appFusionRoutesForHost(entry.appFusionRoutes ?? [], host).length > 0)
    .map((host) => host.permanentId);
}

export function eligibleBase(input: {
  handEntries: readonly HandEntry[];
  you: PlayerState;
  handSel: string | null;
  perm: Permanent;
}): boolean {
  const { handEntries, you, handSel, perm } = input;
  return (
    digivolveTargetsOf({ handEntries, instanceId: handSel ?? undefined }).includes(perm.permanentId) ||
    appFusionHostIdsOf({ handEntries, you, instanceId: handSel ?? undefined }).includes(perm.permanentId)
  );
}

/** The server's prices for one hand card's digivolution paths, or undefined when it
 * published none (the card is not in the turn player's Main-phase hand). */
export function digivolveRoutesOf(input: {
  handEntries: readonly HandEntry[];
  instanceId: string;
}): readonly ProjectedDigivolveRoute[] | undefined {
  const { handEntries, instanceId } = input;
  return handEntries.find((candidate) => candidate.instanceId === instanceId)?.digivolveRoutes;
}
