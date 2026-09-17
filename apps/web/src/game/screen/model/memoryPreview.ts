import type { Permanent, PlayerState } from "@aegis/shared";
import { getDigivolveCostOptions } from "../../boardModel";
import type { HandEntry } from "../../piece";
import type { DragIntent } from "../../dragIntents";
import type { MemoryDropTarget } from "../../memoryCostPreview";
import { DragKind } from "../enums";
import type { DragState, DropZoneHit } from "../types";
import { digivolveRoutesOf } from "./eligibility";

// Where memory would land if the action the pointer is offering were taken. Which
// action that is changes with the pointer: a hovered or selected hand card prices its
// play, a drag over a base prices the digivolution onto that base, and a drag over an
// area that would refuse the drop prices nothing. The costs are the server's own
// (`projectedPlayCost`, and the paths `getDigivolveCostOptions` reads off the routes
// the server offered); the printed figure is only the fallback for a card it did not
// project. Still a dashed prediction that gates nothing: a [BeforePayCost] reducer can
// lower it again at pay time, which the server cannot resolve without prompting.
export function previewEntry(input: {
  dragIsPlay: boolean;
  drag: DragState | null;
  hoveredHandInstanceId: string | undefined;
  handSel: string | null;
  handEntries: readonly HandEntry[];
}): HandEntry | undefined {
  const { dragIsPlay, drag, hoveredHandInstanceId, handSel, handEntries } = input;
  if (dragIsPlay && drag && drag.kind === DragKind.Play)
    return handEntries.find((candidate) => candidate.instanceId === drag.instanceId);
  const instanceId = hoveredHandInstanceId ?? handSel ?? undefined;
  if (instanceId === undefined) return undefined;
  return handEntries.find((candidate) => candidate.instanceId === instanceId);
}

/** The cheapest priced digivolution path onto `base`, or undefined when none is priced. */
export function cheapestDigivolveCost(input: {
  cardId: string;
  instanceId: string;
  base: Permanent | undefined;
  you: PlayerState;
  opp: PlayerState;
  handEntries: readonly HandEntry[];
}): number | undefined {
  const { cardId, instanceId, base, you, opp, handEntries } = input;
  if (!base) return undefined;
  const costs = getDigivolveCostOptions(cardId, base, you, opp, digivolveRoutesOf({ handEntries, instanceId })).map(
    (option) => option.cost,
  );
  return costs.length > 0 ? Math.min(...costs) : undefined;
}

// What the hovered area would do with the card in the air, priced. Read off the same
// intent the board paints, so the preview and the drop can never disagree.
export function previewDropTarget(input: {
  dragIsPlay: boolean;
  drag: DragState | null;
  dragHover: DropZoneHit | null;
  hoveredDragIntent: DragIntent | null;
  you: PlayerState;
  opp: PlayerState;
  handEntries: readonly HandEntry[];
}): MemoryDropTarget | undefined {
  const { dragIsPlay, drag, dragHover, hoveredDragIntent, you, opp, handEntries } = input;
  if (!dragIsPlay || !drag || !dragHover || drag.kind !== DragKind.Play) return undefined;
  switch (hoveredDragIntent) {
    case "play":
    case "use":
      return { kind: "field" };
    case "evolve": {
      const base = you.battleArea.find((permanent) => permanent.permanentId === dragHover.id);
      return {
        kind: "permanent",
        digivolve: {
          cost: cheapestDigivolveCost({
            cardId: drag.cardId,
            instanceId: drag.instanceId,
            base,
            you,
            opp,
            handEntries,
          }),
        },
      };
    }
    case "breeding":
      return {
        kind: "breeding",
        digivolve: {
          cost: cheapestDigivolveCost({
            cardId: drag.cardId,
            instanceId: drag.instanceId,
            base: you.breeding,
            you,
            opp,
            handEntries,
          }),
        },
      };
    default:
      return { kind: "refused" };
  }
}
