import { isDeepStrictEqual } from "node:util";
import type { Intent } from "@aegis/shared";
import type { TrainingWindow } from "./policy.js";

/** Map a demonstration onto the unchanged legal action space; unavailable labels stay explicit. */
export function teacherActionIndex(
  window: TrainingWindow,
  intent: Intent,
  originatingIntent?: Intent,
): number | undefined {
  if (
    intent.type === "playCard" &&
    intent.assembly !== undefined &&
    window.kind === "selectCards" &&
    window.request === undefined
  ) {
    // Private Assembly windows carry material identities, but no destination. Bind
    // them to the selected legal declaration before using the teacher's recipe.
    if (
      originatingIntent?.type !== "playCard" ||
      originatingIntent.assembly === undefined ||
      originatingIntent.instanceId !== intent.instanceId
    )
      return undefined;
    const order = intent.assembly.materialInstanceIds;
    if (
      order.length === 0 ||
      new Set(order).size !== order.length ||
      window.selected.length > order.length ||
      window.selected.some((id, index) => id !== order[index])
    )
      return undefined;
    if (
      !window.actions.every(
        (action) =>
          action.intent.type === "respondDecision" &&
          action.intent.decisionId === "assembly" &&
          action.intent.response.kind === "selectCards",
      )
    )
      return undefined;
    const next = order[window.selected.length];
    const index = window.actions.findIndex((action) => {
      const marker = action.intent;
      if (marker.type !== "respondDecision" || marker.response.kind !== "selectCards") return false;
      // Finish keeps the destination sourceId. The private response, rather than
      // a display label or sourceId, distinguishes it from a material choice.
      return next === undefined
        ? marker.response.instanceIds.length === 0
        : marker.response.instanceIds.length === 1 && marker.response.instanceIds[0] === next;
    });
    return index < 0 ? undefined : index;
  }
  if (intent.type === "respondDecision" && window.request !== undefined) {
    if (intent.decisionId !== window.request.decisionId) return undefined;
    const response = intent.response;
    if (response.kind !== window.request.kind) return undefined;
    if (response.kind === "selectCards" || response.kind === "chooseTargets" || response.kind === "orderCards") {
      const order = response.kind === "orderCards" ? response.order : response.instanceIds;
      if (window.selected.some((id, index) => id !== order[index])) return undefined;
      const next = order[window.selected.length];
      const index = window.actions.findIndex((action) =>
        // Finish and decline markers have no material reference. Assembly uses its own
        // labels, but the teacher's empty selection has the same meaning there.
        next === undefined ? action.sourceId === undefined : action.sourceId === next,
      );
      return index < 0 ? undefined : index;
    }
  }
  const index = window.actions.findIndex((action) => isDeepStrictEqual(action.intent, intent));
  return index < 0 ? undefined : index;
}
