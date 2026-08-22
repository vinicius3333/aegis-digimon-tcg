// Self-cost reducers a card applies to its own play or digivolve.

import type { EffectContext } from "../../EffectContext.js";
import { evaluateCondition } from "../conditions.js";
import { payCost } from "../costs.js";
import { runAction } from "../dispatch.js";
import { scaleFactor } from "../scaling.js";
import { candidateLooseInstances } from "../targeting/loose.js";
import { resolvePermanentTargets } from "../targeting/permanents.js";
import type { Action, CardEffect, Condition, Cost, Permanent, Scaling, ZoneRef } from "@aegis/shared";

/**
 * A self-targeted "when THIS card would be played, [gate], reduce the play cost by N" reducer.
 * Exactly one of `cost`, `costActions`, or (`condition`/`scaling`) applies:
 *   - `cost`: a structured, payable Cost (suspend/unsuspend/return/trash) — offered as a "you may"
 *     choice, paid via `payCost` (EX8-074, BT17-068, ...).
 *   - `costActions`: an "actions" cost body (place/trash/delete a card — SelectBind+TrashDigivolution+
 *     PlaceUnder, or an optional Delete) — offered as a "you may" choice, paid by running the actions
 *     (BT12-112, BT8-043).
 *   - `condition`/`scaling`: no payment at all — a mandatory, automatic reduction gated by a board
 *     condition and/or scaled by a matching-card count (BT9-097, BT8-036, BT8-010, BT9-112).
 */
export interface WouldBePlayedSelfReducer {
  amount: number;
  raw: string;
  /** Hand-written payment hook for costs whose card-selection/movement shape is not representable as Cost. */
  pay?: (ctx: EffectContext) => Promise<boolean>;
  cost?: Cost;
  costActions?: Action[];
  condition?: Condition;
  scaling?: Scaling;
}

const WOULD_BE_PLAYED_SELF_REDUCERS = new Map<string, WouldBePlayedSelfReducer[]>();

/** Register a card-local, hand-written pay-time reducer without serializing executable behavior as IR. */
export function registerWouldBePlayedSelfReducer(cardId: string, reducer: WouldBePlayedSelfReducer): void {
  const current = WOULD_BE_PLAYED_SELF_REDUCERS.get(cardId) ?? [];
  const withoutSameKey = current.filter(({ raw }) => raw !== reducer.raw);
  WOULD_BE_PLAYED_SELF_REDUCERS.set(cardId, [...withoutSameKey, reducer]);
}

const STRUCTURED_REDUCER_COSTS = new Set(["suspend", "unsuspend", "return", "trash"]);

/**
 * Cards whose "When THIS card would be played, by [structured cost], reduce the play cost by N"
 * real payable cost. The runtime record under-specifies the `wouldBePlayed reduceCost` IR — it drops
 * the "this card" identity (so EX3-040's "a green Digimon" looks identical to a self-reducer) and
 * sometimes mis-parses a conditional reduction as a cost (BT16-065) — so structural detection alone
 * is unsafe. This allowlist is the gate; new entries require reading the card's effect text.
 */
const VERIFIED_SELF_REDUCER_CARDS = new Set([
  "BT2-099", // self Option use cost -1 per yellow Tamer
  "BT2-112", // opponent has a 10000+ DP Digimon -> -6
  "EX8-074", // suspend 2 Digimon -> -4
  "BT17-068", // return 1 [Apocalymon] from trash -> -3
  "EX9-011", // trash 1 [Cyborg]/[Ver.1] from hand -> -2
  "EX9-018", // trash 1 [Cyborg]/[Ver.x] from hand -> -2
  "EX9-030", // trash 1 [Cyborg]/[Ver.x] from hand -> -2
  "EX9-064", // trash 1 [Cyborg]/[Ver.x] from hand -> -2
  "EX9-044", // suspend 1 [WG] Digimon -> -4
  "P-170", // return 3 [Three Musketeers]-text from trash -> -6
  "P-171", // face-up [Deep Savers] in security -> -4
  "P-172", // face-up [Nature Spirits] in security -> -4
  "P-174", // face-up [Nightmare Soldiers] in security -> -4
  "ST14-09", // reduce this card's play cost by 4 for every 10 cards in your trash
  "BT12-112", // place 1 [Shoutmon] as digivolution material -> -1 (KB Q2249-Q2256)
  "BT8-043", // delete 1 purple [Cherubimon] -> -8
  "BT9-097", // condition: you have a Digimon with [X Antibody] card name in play -> -2 (KB Q1902)
  "BT8-036", // condition: you have a blue Digimon in play -> -1
  "BT8-010", // condition: you have a yellow Digimon in play -> -1 (KB Q1700; IR condition added)
  "ST9-04", // condition: you have a green Digimon in play -> -1
  "ST9-09", // condition: you have a blue Digimon in play -> -1
  "EX2-045", // condition: you have Guilmon/Terriermon/Renamon/Impmon in play -> -2
  "BT9-112", // scaling: -3 per opponent Digimon/Tamer in play (KB Q1928)
  "BT10-098", // condition: opponent has 2+ Digimon -> Option use cost -2
  "BT10-103", // condition: you have 2+ suspended green Digimon -> Option use cost -2
  "BT23-031", // condition: you have LadyDevimon or Mirei Mikagura -> self play cost -3
  "BT23-034", // condition: you have a Zaxon Tamer -> self play cost -5
  "BT23-036", // condition: opponent has a 10000+ DP Digimon -> self play cost -5
  "BT8-097", // scaling: Option use cost -1 per opposing Digimon (floor applied by play path)
  "BT25-044", // 6 or fewer total security cards -> -5 (Q7004 effect-driven stacking)
  "BT25-059", // 2+ suspended Digimon -> -5 (Q6306/Q6350)
  "BT25-075", // fewer Digimon than your opponent -> -5 (Q6370-Q6372)
  "BT25-077", // condition: 12+ total Digimon levels -> -5 (Q7002 effect-driven stacking)
  "BT22-041", // condition: total cards in both security stacks <= 6 -> self play cost -6
  "BT11-096", // condition: you have a red Tamer -> Option use cost -1
  "BT11-099", // condition: you have a blue Tamer -> Option use cost -1
  "BT11-100", // condition: you have a yellow Tamer -> Option use cost -1
  "BT11-101", // condition: you have a yellow Tamer -> Option use cost -1
  "BT11-103", // condition: you have a green Tamer -> Option use cost -1
  "BT11-104", // condition: you have a green Tamer -> Option use cost -1
  "BT11-105", // condition: you have a Snatchmon -> Option use cost -1
  "BT11-106", // condition: you have a black Tamer -> Option use cost -1
  "BT11-107", // condition: you have X Antibody in play -> Option use cost -2
  "BT11-108", // condition: you have a black Tamer -> Option use cost -1
  "BT11-110", // condition: you have a purple Tamer -> Option use cost -1
]);

/**
 * The runtime record compiles "When this card would be played, by [cost], reduce the play cost by N"
 * into a `wouldBePlayed reduceCost` Replacement — but the play path consumes pay-time reductions
 * only through `BeforePayCost`/`playCostDelta`, leaving these self-reducers inert (EX8-074, BT17-068).
 * Collect the unambiguous self-targeted ones (an explicit "this card" raw + a STRUCTURED cost, no
 * cross-card target/condition/place-actions) so the play path can run them at BeforePayCost. The
 * gate is deliberately tight: cross-card reducers (BT13-007: "when a [Royal Knight] would be
 * played") and conditional/raw-cost forms are NOT matched and stay as-is.
 */
/** A sourceFilter that gates which PLAYED card a wouldBePlayed reaction watches. */
type SourceFilter = {
  names?: unknown;
  nameOrTrait?: unknown;
  traits?: unknown;
  kind?: unknown;
  kinds?: unknown;
  colors?: unknown;
  levels?: unknown;
  levelComparison?: unknown;
};

/**
 * True when a wouldBePlayed `sourceFilter` discriminates by something OTHER than controller — i.e.
 * it targets a SUBSET of cards ("a [Royal Knight] Digimon"), making the reducer cross-card. A filter
 * with only `controllerDefault`/`controller` (or none) is the self/"this card" form the runtime record
 * under-specifies — we restrict it to the bearer by keying the reducer on the bearer's cardId.
 */
function sourceFilterDiscriminates(sf: SourceFilter | undefined): boolean {
  if (sf === undefined) return false;
  return (
    sf.names !== undefined ||
    sf.nameOrTrait !== undefined ||
    sf.traits !== undefined ||
    sf.kind !== undefined ||
    sf.kinds !== undefined ||
    sf.colors !== undefined ||
    sf.levels !== undefined ||
    sf.levelComparison !== undefined
  );
}

/**
 * Capture a `reduceCost` Replacement item as a self-reducer, given its own gate (`cost`/`condition`)
 * plus whatever sibling "cost" actions accompany it (`costActionsRaw` — a Delete/SelectBind body that
 * pays the reduction, empty when there is none) and the outer action's `scaling` (if any). Exactly
 * one payment shape wins, in priority order:
 *   1. A structured, payable `cost` (suspend/unsuspend/return/trash) — the ORIGINAL verified shape
 *      (EX8-074, BT17-068, ...). A `condition` alongside it is unsupported and rejects the capture
 *      (preserves the pre-existing strict behavior for these cards).
 *   2. A non-empty `costActionsRaw` body (BT12-112, BT8-043) — same condition restriction.
 *   3. Neither: a `condition` and/or `scaling` gate with NO payment at all — a mandatory, automatic
 *      reduction (BT9-097, BT8-036, BT8-010, BT9-112).
 */
function captureReducer(
  costActionsRaw: readonly unknown[],
  a: {
    kind?: string;
    event?: string;
    mode?: string;
    cost?: Cost;
    amount?: unknown;
    raw?: string;
    condition?: unknown;
    target?: unknown;
  },
  scaling: Scaling | undefined,
  fallbackRaw: string,
  out: WouldBePlayedSelfReducer[],
): void {
  if (a.kind !== "Replacement" || a.event !== "wouldBePlayed" || a.mode !== "reduceCost") return;
  if (a.target !== undefined) return;
  if (typeof a.amount !== "number") return;
  const amount = a.amount;
  const raw = a.raw && a.raw.length > 4 ? a.raw : fallbackRaw;
  const condition = a.condition as Condition | undefined;
  if (a.cost !== undefined) {
    if (condition !== undefined) return;
    if (!STRUCTURED_REDUCER_COSTS.has(a.cost.kind)) return;
    out.push({ cost: a.cost, amount, raw });
    return;
  }
  if (costActionsRaw.length > 0) {
    if (condition !== undefined) return;
    out.push({ costActions: costActionsRaw as Action[], amount, raw });
    return;
  }
  if (condition !== undefined || scaling !== undefined) {
    out.push({ condition, scaling, amount, raw });
  }
}

export function collectWouldBePlayedSelfReducers(cardId: string, effects: readonly CardEffect[]): void {
  if (!VERIFIED_SELF_REDUCER_CARDS.has(cardId)) return;
  const out: WouldBePlayedSelfReducer[] = [];
  for (const effect of effects) {
    for (const action of effect.actions ?? []) {
      const a = action as {
        kind?: string;
        event?: string;
        mode?: string;
        sourceFilter?: SourceFilter;
        actions?: unknown[];
        scaling?: Scaling;
        raw?: string;
      } & Record<string, unknown>;
      if (a.kind !== "Replacement" || a.event !== "wouldBePlayed") continue;
      if (sourceFilterDiscriminates(a.sourceFilter)) continue;
      // Flat form (BT12-112): the reduceCost mode/amount AND its own cost-actions body live on
      // this same action object.
      if (a.mode === "reduceCost") {
        captureReducer(a.actions ?? [], a, a.scaling, "Reduce the play cost.", out);
        continue;
      }
      // Nested form (EX8-074, BT17-068, BT8-043, BT9-097, BT8-036, BT8-010, BT9-112): an outer
      // wouldBePlayed reaction (sourceFilter = "mine", no card discriminator) wraps an inner
      // reduceCost Replacement (amount/condition) alongside sibling "cost" actions (a Delete, a
      // SelectBind+TrashDigivolution+PlaceUnder chain) that pay for the reduction. Isolate the
      // inner reduceCost item; everything else in the same array is the cost payload.
      if (Array.isArray(a.actions)) {
        const inner = a.actions.find(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            (item as { kind?: string }).kind === "Replacement" &&
            (item as { event?: string }).event === a.event &&
            (item as { mode?: string }).mode === "reduceCost",
        ) as Record<string, unknown> | undefined;
        if (inner === undefined) continue;
        const costActions = a.actions.filter((item) => item !== inner);
        // Some generated records put the eligibility gate on the OUTER wouldBePlayed
        // wrapper and leave the nested reduceCost item unconditional (EX2-045).  The
        // pay-time self-reducer bypasses runAction on that wrapper, so carry its condition
        // into the captured reducer unless the nested item supplies a more specific gate.
        const innerWithGate = {
          ...inner,
          condition: inner.condition ?? a.condition,
        };
        captureReducer(costActions, innerWithGate as never, a.scaling, "Reduce the play cost.", out);
      }
    }
  }
  if (out.length > 0) WOULD_BE_PLAYED_SELF_REDUCERS.set(cardId, out);
}

/** The self-targeted pay-time cost reducers for a played card (empty when none). */
export function wouldBePlayedSelfReducersFor(cardId: string): WouldBePlayedSelfReducer[] {
  return WOULD_BE_PLAYED_SELF_REDUCERS.get(cardId) ?? [];
}

export interface WouldDigivolveSelfReducer {
  cost?: Cost;
  scaling?: Scaling;
  amount: number;
  raw: string;
}

const WOULD_DIGIVOLVE_SELF_REDUCERS = new Map<string, WouldDigivolveSelfReducer[]>();

const VERIFIED_DIGIVOLVE_SELF_REDUCER_CARDS = new Set([
  "EX3-054", // return up to 5 [D-Brigade] cards from trash to deck top -> -1 each (KB Q3423)
  "BT22-038", // -1 for each face-down digivolution card on the Ver.1 base (KB Q4884/Q5196)
]);

export function collectWouldDigivolveSelfReducers(cardId: string, effects: readonly CardEffect[]): void {
  if (!VERIFIED_DIGIVOLVE_SELF_REDUCER_CARDS.has(cardId)) return;
  const reducers: WouldDigivolveSelfReducer[] = [];
  for (const effect of effects) {
    for (const outer of effect.actions) {
      if (outer.kind !== "Replacement" || outer.event !== "wouldDigivolve") continue;
      for (const action of outer.actions ?? []) {
        if (
          action.kind === "Replacement" &&
          action.event === "wouldDigivolve" &&
          action.mode === "reduceCost" &&
          (action.cost !== undefined || action.scaling !== undefined) &&
          typeof action.amount === "number"
        ) {
          reducers.push({
            ...(action.cost !== undefined ? { cost: action.cost } : {}),
            ...(action.scaling !== undefined ? { scaling: action.scaling } : {}),
            amount: action.amount,
            raw: action.cost?.raw ?? action.raw ?? "Reduce the digivolution cost.",
          });
        }
      }
    }
  }
  if (reducers.length > 0) WOULD_DIGIVOLVE_SELF_REDUCERS.set(cardId, reducers);
}

export function wouldDigivolveSelfReducersFor(cardId: string): WouldDigivolveSelfReducer[] {
  return WOULD_DIGIVOLVE_SELF_REDUCERS.get(cardId) ?? [];
}

function digivolveReducerScale(ctx: EffectContext, reducer: WouldDigivolveSelfReducer, target?: Permanent): number {
  if (reducer.scaling === undefined) return 1;
  if (target !== undefined && reducer.scaling.unit === "digivolutionCards") {
    const filter = reducer.scaling.filter ?? {};
    const count = target.stack.filter((card) =>
      (filter.faceDown !== true || card.faceUp !== true) && (filter.faceUp !== true || card.faceUp === true),
    ).length;
    return Math.floor(count / Math.max(1, reducer.scaling.per));
  }
  return scaleFactor(ctx, reducer.scaling);
}

export function potentialWouldDigivolveSelfReduction(ctx: EffectContext, reducer: WouldDigivolveSelfReducer, target?: Permanent): number {
  const scale = digivolveReducerScale(ctx, reducer, target);
  if (reducer.cost === undefined) return Math.max(0, reducer.amount * scale);
  if (reducer.cost.target?.upTo !== true || typeof reducer.cost.target.count !== "number") {
    return reducer.amount * scale;
  }
  const zones: ZoneRef[] = reducer.cost.target.filter.zone === "trash" ? ["trash"] : [];
  if (zones.length === 0) return 0;
  const candidates = candidateLooseInstances(ctx, reducer.cost.target, zones);
  return reducer.amount * Math.min(reducer.cost.target.count, candidates.length);
}

export async function applyWouldDigivolveSelfReducer(
  ctx: EffectContext,
  reducer: WouldDigivolveSelfReducer,
  target?: Permanent,
): Promise<number> {
  if (potentialWouldDigivolveSelfReduction(ctx, reducer, target) === 0) return 0;
  if (reducer.cost === undefined) return potentialWouldDigivolveSelfReduction(ctx, reducer, target);
  if (!(await ctx.ask.optional(ctx, reducer.raw))) return 0;
  const receipt = { paidCount: 0 };
  if (!(await payCost(ctx, reducer.cost, receipt))) return 0;
  return Math.max(0, reducer.amount * receipt.paidCount);
}

/**
 * Run a `costActions` self-reducer's cost body (BT12-112's SelectBind+TrashDigivolution+PlaceUnder,
 * BT8-043's optional Delete) AFTER the controller has already agreed to pay it via the reducer-level
 * "you may" prompt in {@link applyWouldBePlayedSelfReducer}. Per-action `optional` flags are stripped
 * before running — the single reducer-level prompt already IS that choice; re-asking would double-
 * prompt for one clause. Returns whether the cost actually resolved: a SelectBind that bound nothing
 * (no valid target) or a Delete that removed nothing means the cost could not be paid, so the caller
 * must not grant the discount (mirrors the structured-`cost` path's `payCost` failing silently).
 */
async function runWouldBePlayedCostActions(ctx: EffectContext, actions: readonly Action[]): Promise<boolean> {
  const selectBindNames: string[] = [];
  let sawDelete = false;
  let sawDeferredRelocation = false;
  for (const raw of actions) {
    const bindAs = (raw as { target?: { bindAs?: string } }).target?.bindAs;
    if (raw.kind === "SelectBind" && bindAs !== undefined) selectBindNames.push(bindAs);
    if (raw.kind === "Delete") sawDelete = true;
    // "Place [this permanent] as this card's OWN bottom digivolution card" (BT12-112): the card
    // being played has no permanent yet at pay-time (`fireBeforePayCost` runs BEFORE the played
    // permanent is created), so `relocatePermanent` cannot run now — there is no destination. Since
    // this action is running inside a SELF reducer's cost body, "under this card" unambiguously
    // means "under the permanent this same play is about to create". Resolve the SOURCE now (already
    // selected via the preceding SelectBind) and stash it on `ctx.pendingSelfReducerRelocations` for
    // the engine to relocate once that permanent exists.
    if (raw.kind === "PlaceUnder" && (raw as { targetIsPermanent?: boolean }).targetIsPermanent === true) {
      const sourceIds = await resolvePermanentTargets(ctx, (raw as Extract<Action, { kind: "PlaceUnder" }>).target);
      if (sourceIds.length === 0) return false;
      ctx.pendingSelfReducerRelocations = [...(ctx.pendingSelfReducerRelocations ?? []), ...sourceIds];
      sawDeferredRelocation = true;
      continue;
    }
    const a = (raw as { optional?: boolean }).optional === true ? { ...raw, optional: false } : raw;
    const abort = await runAction(ctx, a as Action);
    if (abort) break;
  }
  if (selectBindNames.length > 0) {
    return selectBindNames.every((name) => ctx.selections?.has(name));
  }
  if (sawDeferredRelocation) return true;
  if (sawDelete) return (ctx.lastDeleteCount ?? 0) > 0;
  return true;
}

/**
 * Apply one self-targeted `wouldBePlayed` cost reducer at pay-time (called from
 * `GameEngine.fireBeforePayCost`). A `cost`/`costActions` reducer is a "you may" choice — decline,
 * or an unpayable cost, earns nothing; a `condition`/`scaling` reducer has no payment at all and
 * applies automatically (mandatory) whenever its gate holds, scaled by the matching-card count.
 */
export async function applyWouldBePlayedSelfReducer(
  ctx: EffectContext,
  reducer: WouldBePlayedSelfReducer,
): Promise<void> {
  if (reducer.pay !== undefined) {
    if (!(await ctx.ask.optional(ctx, reducer.raw))) return;
    if (await reducer.pay(ctx)) {
      ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, reducer.amount);
    }
    return;
  }
  if (reducer.cost !== undefined) {
    if (!(await ctx.ask.optional(ctx, reducer.raw))) return;
    if (await payCost(ctx, reducer.cost)) {
      ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, reducer.amount);
    }
    return;
  }
  if (reducer.costActions !== undefined) {
    if (!(await ctx.ask.optional(ctx, reducer.raw))) return;
    if (await runWouldBePlayedCostActions(ctx, reducer.costActions)) {
      ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, reducer.amount);
    }
    return;
  }
  if (reducer.condition !== undefined && !evaluateCondition(ctx, reducer.condition)) return;
  const scale = reducer.scaling !== undefined ? scaleFactor(ctx, reducer.scaling) : 1;
  ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, reducer.amount * scale);
}
