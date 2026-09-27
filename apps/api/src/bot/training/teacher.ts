import { isDeepStrictEqual } from "node:util";
import type { Intent } from "@aegis/shared";
import type { TrainingWindow } from "./policy.js";

/** Map a demonstration onto the unchanged legal action space; unavailable labels stay explicit. */
export function teacherActionIndex(window: TrainingWindow, intent: Intent): number | undefined {
  if (intent.type === "respondDecision" && window.request !== undefined) {
    if (intent.decisionId !== window.request.decisionId) return undefined;
    const response = intent.response;
    if (response.kind !== window.request.kind) return undefined;
    if (response.kind === "selectCards" || response.kind === "chooseTargets" || response.kind === "orderCards") {
      const order = response.kind === "orderCards" ? response.order : response.instanceIds;
      if (window.selected.some((id, index) => id !== order[index])) return undefined;
      const next = order[window.selected.length];
      const index = window.actions.findIndex((action) =>
        next === undefined ? action.label === "Finish selection" : action.sourceId === next,
      );
      return index < 0 ? undefined : index;
    }
  }
  const index = window.actions.findIndex((action) => isDeepStrictEqual(action.intent, intent));
  return index < 0 ? undefined : index;
}
