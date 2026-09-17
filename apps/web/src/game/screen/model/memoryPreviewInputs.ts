/* Where memory would land if the action the pointer is offering were taken.

   Which action that is changes with the pointer: a hovered or selected hand card prices
   its play, a drag over a base prices the digivolution onto that base, and a drag over an
   area that would refuse the drop prices nothing. The costs are the server's own
   (`projectedPlayCost`, and the paths `getDigivolveCostOptions` reads off the routes the
   server offered); the printed figure is only the fallback for a card the server did not
   project.

   The result is a dashed prediction that gates nothing: a [BeforePayCost] reducer can
   lower it again at pay time, which the server cannot resolve without prompting. */

import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { memoryCostPreview } from "../../memoryCostPreview";
import { predictedMemory } from "../../memoryArc";
import type { DragIntent } from "../../dragIntents";
import type { HandEntry } from "../../piece";
import { previewDropTarget, previewEntry } from "./memoryPreview";
import type { DragState, DropZoneHit } from "../types";

export function memoryPreviewInputs({
  memory,
  dragIsPlay,
  drag,
  dragHover,
  hoveredDragIntent,
  hoveredHandInstanceId,
  handSel,
  handEntries,
  viewer,
  opponent,
}: {
  memory: number;
  dragIsPlay: boolean;
  drag: DragState | null;
  dragHover: DropZoneHit | null;
  hoveredDragIntent: DragIntent | null;
  hoveredHandInstanceId: string | undefined;
  handSel: string | null;
  handEntries: HandEntry[];
  viewer: PlayerState;
  opponent: PlayerState;
}) {
  const entry = previewEntry({ dragIsPlay, drag, hoveredHandInstanceId, handSel, handEntries });
  const playCost = entry
    ? entry.projectedPlayCost >= 0
      ? entry.projectedPlayCost
      : (() => {
          const printed = getCardDefinition(entry.cardId)?.playCost;
          return printed !== undefined && printed >= 0 ? printed : undefined;
        })()
    : undefined;
  const candidate = memoryCostPreview({
    heldCard: entry ? { playable: entry.playableFromHand === true, playCost } : undefined,
    dropTarget: previewDropTarget({
      dragIsPlay,
      drag,
      dragHover,
      hoveredDragIntent,
      you: viewer,
      opp: opponent,
      handEntries,
    }),
  });
  return { memoryPrediction: candidate ? predictedMemory(memory, candidate.cost) : undefined };
}
