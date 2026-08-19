// Choosing between the options of a modal action.

import type { EffectContext } from "../../EffectContext.js";
import { evaluateCondition } from "../conditions.js";
import { canPayCost } from "../costs.js";
import { describeAction } from "../describe.js";
import { runAction } from "../dispatch.js";
import { scaleFactor } from "../scaling.js";
import { canAttemptDigivolve } from "./digivolve.js";
import { canAttemptDnaDigivolve } from "./dna.js";
import type { Action } from "@aegis/shared";

/** "Activate N of the effects below" — ask the controller which option(s), run them. */
export async function runModal(ctx: EffectContext, action: Extract<Action, { kind: "Modal" }>): Promise<void> {
  if (action.options.length === 0) return;
  const availableIndices = action.options
    .map((option, idx) => ({ option, idx }))
    .filter(({ option }) => option.some((nested) => canAttemptModalAction(ctx, nested)))
    .map(({ idx }) => idx)
    .filter((idx) => {
      const condition = action.optionConditions?.[idx];
      return condition == null || evaluateCondition(ctx, condition);
    });
  if (availableIndices.length === 0) return;
  if (action.chooseAll !== undefined && evaluateCondition(ctx, action.chooseAll.condition)) {
    for (const idx of availableIndices) {
      const option = action.options[idx]!;
      for (const nestedAction of option) {
        const abort = await runAction(ctx, nestedAction);
        if (abort) break;
      }
    }
    return;
  }
  const rawChoose = action.chooseScaling !== undefined ? scaleFactor(ctx, action.chooseScaling) : action.choose;
  const choose = Math.min(rawChoose, availableIndices.length);
  const chosenIndices: number[] = choose === 1 && availableIndices.length === 1 ? [availableIndices[0]!] : [];
  for (let i = 0; i < choose; i++) {
    if (chosenIndices.length >= choose) break;
    const remaining = availableIndices.filter((idx) => !chosenIndices.includes(idx));
    if (remaining.length === 0) break;
    const labels = remaining.map(
      (idx) =>
        action.labels?.[idx] ??
        (action.options[idx]!.length > 0
          ? action.options[idx]!.map(describeAction).join(" · ")
          : describeAction({ kind: "RawUnparsed", text: `option ${idx}` })),
    );
    const pick = await ctx.ask.chooseOption(ctx, labels);
    const chosen = remaining[pick] ?? remaining[0]!;
    chosenIndices.push(chosen);
  }
  for (const idx of chosenIndices) {
    for (const a of action.options[idx]!) {
      const abort = await runAction(ctx, a);
      if (abort) break;
    }
  }
}

/** Synchronous availability for one nested modal action; no decisions or mutations. */
function canAttemptModalAction(ctx: EffectContext, action: Action): boolean {
  if (
    action.condition?.kind !== undefined &&
    action.condition.kind !== "raw" &&
    !evaluateCondition(ctx, action.condition)
  ) {
    return false;
  }
  if (action.cost !== undefined && !canPayCost(ctx, action.cost)) return false;
  if (action.kind === "Digivolve") return canAttemptDigivolve(ctx, action);
  if (action.kind === "DnaDigivolve") return canAttemptDnaDigivolve(ctx, action);
  return action.kind !== "RawUnparsed";
}
