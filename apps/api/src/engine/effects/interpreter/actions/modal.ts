// Choosing between the options of a modal action.

import type { EffectContext } from "../../EffectContext.js";
import { evaluateCondition } from "../conditions.js";
import { canPayCost } from "../costs.js";
import { describeAction } from "../describe.js";
import { runAction } from "../dispatch.js";
import { scaleFactor } from "../scaling.js";
import { DEFAULT_PLAY_ZONES, candidateLooseInstances } from "../targeting/loose.js";
import { canAttemptDigivolve } from "./digivolve.js";
import { canAttemptDnaDigivolve } from "./dna.js";
import { applyPlayCostCeiling } from "./play.js";
import type { Action } from "@aegis/shared";

/** "Activate N of the effects below" — ask the controller which option(s), run them. */
export async function runModal(ctx: EffectContext, action: Extract<Action, { kind: "Modal" }>): Promise<void> {
  if (action.options.length === 0) return;
  const availableOptionIndices = (): number[] =>
    action.options
      .map((option, idx) => ({ option, idx }))
      .filter(({ option }) => option.some((nested) => canAttemptModalAction(ctx, nested)))
      .map(({ idx }) => idx)
      .filter((idx) => {
        const condition = action.optionConditions?.[idx];
        return condition == null || evaluateCondition(ctx, condition);
      });
  const availableIndices = availableOptionIndices();
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

  // "For every N, activate 1 of the effects below" snapshots N now, then chooses and resolves
  // one effect at a time. Unlike an ordinary "activate N of the effects" modal, each scaled
  // activation may choose the same bullet again (EX12-037 Q6795-Q6797). Re-evaluate which
  // bullets are executable after each resolution, but never recalculate the activation count.
  if (action.chooseScaling !== undefined) {
    for (let i = 0; i < rawChoose; i += 1) {
      const currentAvailable = availableOptionIndices();
      if (currentAvailable.length === 0) break;
      const labels = currentAvailable.map(
        (idx) =>
          action.labels?.[idx] ??
          (action.options[idx]!.length > 0
            ? action.options[idx]!.map(describeAction).join(" · ")
            : describeAction({ kind: "RawUnparsed", text: `option ${idx}` })),
      );
      const pick = await ctx.ask.chooseOption(ctx, labels);
      const chosen = currentAvailable[pick] ?? currentAvailable[0]!;
      for (const nestedAction of action.options[chosen]!) {
        const abort = await runAction(ctx, nestedAction);
        if (abort) break;
      }
    }
    return;
  }

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
  if (action.cost !== undefined && typeof action.cost !== "number" && !canPayCost(ctx, action.cost)) return false;
  if (action.kind === "Digivolve") return canAttemptDigivolve(ctx, action);
  if (action.kind === "DnaDigivolve") return canAttemptDnaDigivolve(ctx, action);
  if (
    action.kind === "PlayWithoutCost" &&
    action.target !== undefined &&
    action.target.isSelf !== true &&
    action.target.filter.isSelfRef !== true &&
    action.fromOwnDigivolutionStack !== true
  ) {
    const zones = action.from && action.from.length > 0 ? action.from : DEFAULT_PLAY_ZONES;
    const target = applyPlayCostCeiling(ctx, action, action.target);
    return candidateLooseInstances(ctx, target, zones).some(
      (candidate) => !ctx.fx.isPlayProhibited?.(ctx.source.ownerSeat, candidate.cardId, "play"),
    );
  }
  return action.kind !== "RawUnparsed";
}
