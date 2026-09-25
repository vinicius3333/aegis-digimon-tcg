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
import {
  applyPlayCostCeiling,
  candidatesAllowedBySameNameRestriction,
  playableCandidates,
  playableTokenRefs,
} from "./play.js";
import { canAttemptPlaceUnder } from "./placeUnder.js";
import type { Action } from "@aegis/shared";

/**
 * Whether any option of a modal can currently be attempted. A modal whose every option is
 * un-attemptable is an unactivatable effect: its activation cost must not be charged for a
 * guaranteed no-op (BT17-050 Q2803).
 */
export function modalHasAvailableOption(ctx: EffectContext, action: Extract<Action, { kind: "Modal" }>): boolean {
  const merged = mergedPlayOrUseAction(action);
  if (merged !== undefined) return canAttemptModalAction(ctx, merged);
  return action.options.some((option, idx) => optionIsAvailable(ctx, action, option, idx));
}

const comparable = (value: unknown): string => JSON.stringify(value);

/** Collapse a compiler-style Play/Use split into the card selection the printed effect describes. */
export function mergedPlayOrUseAction(
  modal: Extract<Action, { kind: "Modal" }>,
): Extract<Action, { kind: "PlayWithoutCost" }> | undefined {
  if (
    modal.choose !== 1 ||
    modal.chooseScaling !== undefined ||
    modal.chooseAll !== undefined ||
    modal.optionConditions !== undefined ||
    modal.options.length !== 2 ||
    modal.options.some((option) => option.length !== 1)
  )
    return undefined;
  const nested = modal.options.flat();
  const play = nested.find(
    (entry): entry is Extract<Action, { kind: "PlayWithoutCost" }> => entry.kind === "PlayWithoutCost",
  );
  const use = nested.find(
    (entry): entry is Extract<Action, { kind: "UseOptionWithoutCost" }> => entry.kind === "UseOptionWithoutCost",
  );
  if (play === undefined || use === undefined) return undefined;
  const playFilter = play.target?.filter;
  const useFilter = use.filter ?? use.target?.filter;
  if (playFilter === undefined || useFilter === undefined) return undefined;
  const { kind: _playKinds, ...playFilterWithoutKind } = playFilter;
  const { kind: _useKinds, ...useFilterWithoutKind } = useFilter;
  if (playFilterWithoutKind.playCostLte === undefined && useFilterWithoutKind.playCostLte === 99) {
    useFilterWithoutKind.playCostLte = undefined;
  }
  if (comparable(playFilterWithoutKind) !== comparable(useFilterWithoutKind)) return undefined;
  for (const key of [
    "from",
    "payCost",
    "reduceCostBy",
    "reduceCostByScaling",
    "playCostCeiling",
    "optional",
    "cost",
    "condition",
  ] as const) {
    if (comparable(play[key]) !== comparable(use[key])) return undefined;
  }
  if (
    use.waiveColorRequirement === true ||
    use.selectionRequired === true ||
    use.reduceCostByOpponentMemory !== undefined
  )
    return undefined;
  return {
    ...play,
    chooseDualMode: true,
    optional: false,
    target: {
      ...play.target,
      upTo: play.optional === true,
      minimum: 0,
      filter: { ...playFilter, kind: ["Digimon", "Tamer", "Option"] },
    },
    raw: play.raw ?? use.raw,
  };
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

function availableOptionIndices(ctx: EffectContext, action: Extract<Action, { kind: "Modal" }>): number[] {
  return action.options
    .map((option, idx) => ({ option, idx }))
    .filter(({ option, idx }) => optionIsAvailable(ctx, action, option, idx))
    .map(({ idx }) => idx);
}

function optionLabel(action: Extract<Action, { kind: "Modal" }>, idx: number): string {
  return (
    action.labels?.[idx] ??
    (action.options[idx]!.length > 0
      ? action.options[idx]!.map(describeAction).join(" · ")
      : describeAction({ kind: "RawUnparsed", text: `option ${idx}` }))
  );
}

/** The engine's label for the decline entry of a combined optional-modal prompt. */
export const DECLINE_MODAL_CHOICE_LABEL = "Don't use";

/**
 * The options an optional "choose 1" modal offers in ONE prompt together with a decline entry,
 * instead of a "use this effect?" question followed by the option choice. Undefined when the
 * modal is not that shape or fewer than two options are available: a single available option
 * keeps the yes/no prompt, whose "yes" already names the only thing that can happen.
 */
export function declinableModalChoices(
  ctx: EffectContext,
  action: Extract<Action, { kind: "Modal" }>,
): { optionIndices: number[]; labels: string[] } | undefined {
  if (
    action.optional !== true ||
    action.choose !== 1 ||
    action.chooseScaling !== undefined ||
    // A cost or scaling resolves between the prompt and the options, and may change which
    // options are available; such a modal keeps the separate yes/no prompt.
    action.cost !== undefined ||
    (action.costOptions?.length ?? 0) > 0 ||
    (action.additionalCosts?.length ?? 0) > 0 ||
    action.additionalCost !== undefined ||
    action.scaling !== undefined ||
    (action.chooseAll !== undefined && evaluateCondition(ctx, action.chooseAll.condition)) ||
    mergedPlayOrUseAction(action) !== undefined
  )
    return undefined;
  const optionIndices = availableOptionIndices(ctx, action);
  if (optionIndices.length < 2) return undefined;
  return { optionIndices, labels: optionIndices.map((idx) => optionLabel(action, idx)) };
}

/** "Activate N of the effects below" — ask the controller which option(s), run them. */
export async function runModal(ctx: EffectContext, action: Extract<Action, { kind: "Modal" }>): Promise<boolean> {
  if (action.options.length === 0) return false;
  const preselected = ctx.preselectedModalOption;
  if (preselected?.action === action) {
    ctx.preselectedModalOption = undefined;
    await runOptions(ctx, action, [preselected.optionIndex]);
    return false;
  }
  const merged = mergedPlayOrUseAction(action);
  if (merged !== undefined) {
    await runAction(ctx, merged);
    return false;
  }
  const availableIndices = availableOptionIndices(ctx, action);
  if (availableIndices.length === 0) return false;
  if (action.chooseAll !== undefined && evaluateCondition(ctx, action.chooseAll.condition)) {
    for (const idx of availableIndices) {
      const option = action.options[idx]!;
      for (const nestedAction of option) {
        const abort = await runAction(ctx, nestedAction);
        if (abort) break;
      }
    }
    return false;
  }
  const rawChoose = action.chooseScaling !== undefined ? scaleFactor(ctx, action.chooseScaling) : action.choose;

  // "For every N, activate 1 of the effects below" snapshots N now, then chooses and resolves
  // one effect at a time. Unlike an ordinary "activate N of the effects" modal, each scaled
  // activation may choose the same bullet again (EX12-037 Q6795-Q6797). Re-evaluate which
  // bullets are executable after each resolution, but never recalculate the activation count.
  if (action.chooseScaling !== undefined) {
    for (let i = 0; i < rawChoose; i += 1) {
      const currentAvailable = availableOptionIndices(ctx, action);
      if (currentAvailable.length === 0) break;
      const labels = currentAvailable.map((idx) => optionLabel(action, idx));
      const pick = await ctx.ask.chooseOption(ctx, labels);
      const chosen = currentAvailable[pick] ?? currentAvailable[0]!;
      if (
        i === 0 &&
        ctx.deferUntilAfterAttackEnd !== undefined &&
        ctx.fx.isAttackResolving?.() === true &&
        action.options[chosen]!.some((nested) => nested.kind === "Battle")
      ) {
        // The choice is made during the attack declaration. An opposing immediate
        // effect can play a new Digimon during that attack, before the chosen Battle
        // picks its defender (EX13-077 Q7477). Keep the choice, then resume this
        // modal's actions after the attack and reevaluate later scaled choices there.
        const resumeOuter = ctx.resumeAfterDeferredModal;
        ctx.deferUntilAfterAttackEnd(async () => {
          for (const nestedAction of action.options[chosen]!) {
            if (await runAction(ctx, nestedAction)) break;
          }
          for (let next = 1; next < rawChoose; next += 1) {
            const nextAvailable = availableOptionIndices(ctx, action);
            if (nextAvailable.length === 0) break;
            const nextLabels = nextAvailable.map((idx) => optionLabel(action, idx));
            const nextPick = await ctx.ask.chooseOption(ctx, nextLabels);
            const nextChosen = nextAvailable[nextPick] ?? nextAvailable[0]!;
            for (const nestedAction of action.options[nextChosen]!) {
              if (await runAction(ctx, nestedAction)) break;
            }
          }
          await resumeOuter?.();
        });
        return true;
      }
      for (const nestedAction of action.options[chosen]!) {
        const abort = await runAction(ctx, nestedAction);
        if (abort) break;
      }
    }
    return false;
  }

  const choose = Math.min(rawChoose, availableIndices.length);
  const chosenIndices: number[] = choose === 1 && availableIndices.length === 1 ? [availableIndices[0]!] : [];
  for (let i = 0; i < choose; i++) {
    if (chosenIndices.length >= choose) break;
    const remaining = availableIndices.filter((idx) => !chosenIndices.includes(idx));
    if (remaining.length === 0) break;
    const labels = remaining.map((idx) => optionLabel(action, idx));
    const pick = await ctx.ask.chooseOption(ctx, labels);
    const chosen = remaining[pick] ?? remaining[0]!;
    chosenIndices.push(chosen);
  }
  await runOptions(ctx, action, chosenIndices);
  return false;
}

async function runOptions(
  ctx: EffectContext,
  action: Extract<Action, { kind: "Modal" }>,
  optionIndices: readonly number[],
): Promise<void> {
  for (const idx of optionIndices) {
    for (const nestedAction of action.options[idx]!) {
      const abort = await runAction(ctx, nestedAction);
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
  // An effect that "can't play cards with the same names as any of your Digimon" cannot create
  // a token whose name is already on your field, so that bullet must not be offered as a
  // guaranteed no-op (BT23-013 / Q5224 + Q1033, issue #4894).
  if (action.kind === "PlayToken") {
    return playableTokenRefs(ctx, action.tokens ?? (action.token !== undefined ? [action.token] : [])).length > 0;
  }
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
    const candidates = candidatesAllowedBySameNameRestriction(
      ctx,
      playableCandidates(ctx, target, candidateLooseInstances(ctx, target, zones), action.chooseDualMode),
    );
    return candidates.some((candidate) => !ctx.fx.isPlayProhibited?.(ctx.source.ownerSeat, candidate.cardId, "play"));
  }
  return action.kind !== "RawUnparsed";
}
