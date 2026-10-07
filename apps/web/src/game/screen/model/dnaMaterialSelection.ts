import type { Permanent } from "@aegis/shared";
import type { ProjectedDnaDigivolveRoute } from "../../digivolveModel";
import type { PendingActionConfirmation } from "../types";

export interface DnaMaterialSelection {
  action: PendingActionConfirmation;
  permanentIds: string[];
}

export function dnaMaterialPicks(
  action: PendingActionConfirmation | null,
  selection: DnaMaterialSelection | null,
): readonly string[] {
  if (action?.kind !== "dna") return [];
  if (selection?.action === action) return selection.permanentIds;
  return action.initialPermanentId ? [action.initialPermanentId] : [];
}

/** Physical picks choose a projected route; its order, cost and legality remain server-owned. */
export function dnaFieldChoice(
  routes: readonly ProjectedDnaDigivolveRoute[],
  permanents: readonly Permanent[],
  picks: readonly string[],
) {
  const live = routes.filter((route) =>
    route.materialPermanentIds.every((id) =>
      permanents.some((permanent) => permanent.permanentId === id && permanent.topCard),
    ),
  );
  const matches = (route: ProjectedDnaDigivolveRoute) =>
    route.materialPermanentIds.length === picks.length && route.materialPermanentIds.every((id) => picks.includes(id));
  const selected =
    live.find((route) => matches(route) && route.materialPermanentIds.every((id, index) => id === picks[index])) ??
    live.find(matches);
  const compatible = live.filter((route) => picks.every((id) => route.materialPermanentIds.includes(id)));
  const candidates = new Set([...picks, ...compatible.flatMap((route) => route.materialPermanentIds)]);
  return { selected, candidates, orderedPicks: selected?.materialPermanentIds ?? picks, available: live.length > 0 };
}

export function toggleDnaMaterial(picks: readonly string[], permanentId: string): string[] {
  return picks.includes(permanentId) ? picks.filter((id) => id !== permanentId) : [...picks, permanentId];
}
