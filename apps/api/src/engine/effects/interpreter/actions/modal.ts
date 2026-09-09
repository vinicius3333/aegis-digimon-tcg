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
import { canAttemptPlaceUnder } from "./placeUnder.js";
import type { Action } from "@aegis/shared";

/**
 * Whether any option of a modal can currently be attempted. A modal whose every option is
 * un-attemptable is an unactivatable effect: its activation cost must not be charged for a
 * guaranteed no-op (BT17-050 Q2803).
 */
export function modalHasAvailableOption(ctx: EffectContext, action: Extract<Action, { kind: "Modal" }>): boolean {
  return action.options.some((option, idx) => optionIsAvailable(ctx, action, option, idx));
}

/**
 * Whether one modal bullet can be chosen. An EMPTY option list is a real "do nothing more" branch,
 * not an unavailable one: it is how a "you may [A] and [B]" payload whose cost has already been
 * paid offers the decline (BT17-050 Q2804). `[].some(...)` is false, so it has to be admitted
 * explicitly; every other option still needs at least one attemptable action.
 */
function optionIsAvailable(
  ctx: EffectContext,
  action: Extract<Action, { kind: "Modal" }>,
  option: readonly Action[],
  idx: number,
): boolean {
  const condition = action.optionConditions?.[idx];
  if (condition != null && !evaluateCondition(ctx, condition)) return false;
  if (option.length === 0) return true;
  return option.some((nested) => canAttemptModalAction(ctx, nested));
}

/** "Activate N of the effects below" — ask the controller which option(s), run them. */
export async function runModal(ctx: EffectContext, action: Extract<Action, { kind: "Modal" }>): Promise<void> {
  if (action.options.length === 0) return;
  const availableOptionIndices = (): number[] =>
    action.options
      .map((option, idx) => ({ option, idx }))
      .filter(({ option, idx }) => optionIsAvailable(ctx, action, option, idx))
      .map(({ idx }) => idx);
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
  // A PlaceUnder is attemptable only when both an eligible card and a legal host exist.
  // Without this the modal is offered with no legal destination, the activation cost is
  // charged, and the placement silently no-ops (BT17-050 Q2803).
  if (action.kind === "PlaceUnder") return canAttemptPlaceUnder(ctx, action);
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
