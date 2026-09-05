// Running another card's effect, or an Option, as an effect of this one.

import type { EffectContext } from "../../EffectContext.js";
import type { CardSource } from "../../CardSource.js";
import type { Effect } from "../../Effect.js";
import { effectsOf } from "../../collect.js";
import { runtimeCompiledCard } from "../compiledCards.js";
import { describeEffect } from "../describe.js";
import { runEffect } from "../dispatch.js";
import { unsupported } from "../errors.js";
import { DefinitionFacts, definitionMatches } from "../matching/definition.js";
import { scaleFactor } from "../scaling.js";
import { candidateLooseInstances, looseCardsInZone } from "../targeting/loose.js";
import { CardKind, EffectTiming } from "@aegis/shared";
import { MemoryGauge } from "../../../MemoryGauge.js";
import type { Action, CardEffect, EffectTrigger, Filter, Seat, ZoneRef } from "@aegis/shared";

/** A foreign card eligible to lend a borrowed effect (its instance + the borrowable effects). */
interface ForeignCandidate {
  instanceId: string;
  cardId: string;
  permanentId?: string;
  borrowable: BorrowableEffect[];
}

interface BorrowableEffect {
  effect: CardEffect;
  sourceInstanceId: string;
  sourceCardId: string;
  sourcePermanentId?: string;
  triggerOrdinal: number;
}

function borrowedTiming(trigger: EffectTrigger): EffectTiming | undefined {
  if (trigger === "OnPlay") return EffectTiming.OnPlay;
  if (trigger === "WhenDigivolving") return EffectTiming.WhenDigivolving;
  if (trigger === "OnDeletion" || trigger === "OnDestroyedAnyone") return EffectTiming.OnDestroyedAnyone;
  return undefined;
}

function borrowedSource(ctx: EffectContext, borrowed: BorrowableEffect): CardSource {
  const definition = ctx.game.definitionOf({ cardId: borrowed.sourceCardId });
  const permanentId = borrowed.sourcePermanentId;
  return {
    instanceId: borrowed.sourceInstanceId,
    cardId: borrowed.sourceCardId,
    ownerSeat: ctx.source.ownerSeat,
    definition,
    permanent: () => (permanentId === undefined ? undefined : ctx.game.permanentById(permanentId)),
    isOnBattleArea: () => permanentId !== undefined && ctx.game.permanentById(permanentId) !== undefined,
    isOwnersTurn: () => ctx.game.state.turnSeat === ctx.source.ownerSeat,
    hasColor: (color) => definition.colors.includes(color),
  } as CardSource;
}

function registeredBorrowedEffect(ctx: EffectContext, borrowed: BorrowableEffect): Effect | undefined {
  const timing = borrowedTiming(borrowed.effect.trigger);
  if (timing === undefined) return undefined;
  return effectsOf(timing, borrowedSource(ctx, borrowed)).filter(
    (effect) => effect.irTrigger === borrowed.effect.trigger,
  )[borrowed.triggerOrdinal];
}

function availableBorrowedEffects(
  ctx: EffectContext,
  effects: BorrowableEffect[],
  stackHostId?: string,
): BorrowableEffect[] {
  return effects.filter((borrowed) => {
    // A stack card lends its printed effect, but the host activates it (EX9-073 Q4841).
    // Keep this timing identity separate from lender registration and usage identity.
    const timingPermanentId = borrowed.sourcePermanentId ?? stackHostId;
    const disabledTiming =
      borrowed.effect.trigger === "WhenDigivolving"
        ? "whenDigivolving"
        : borrowed.effect.trigger === "OnPlay"
          ? "onPlay"
          : undefined;
    if (
      disabledTiming !== undefined &&
      timingPermanentId !== undefined &&
      (ctx.fx.isTimingEffectDisabled?.(timingPermanentId, disabledTiming) ??
        ctx.game.isTimingEffectDisabled?.(timingPermanentId, disabledTiming)) === true
    ) {
      return false;
    }
    const registered = registeredBorrowedEffect(ctx, borrowed);
    return registered === undefined || ctx.usage === undefined
      ? true
      : registered.maxPerTurn <= 0 ||
          ctx.usage.count(borrowed.sourceInstanceId, registered.effectKey) < registered.maxPerTurn;
  });
}

function borrowableFromCompiled(args: {
  compiled: NonNullable<ReturnType<typeof runtimeCompiledCard>>;
  action: Extract<Action, { kind: "ActivateForeignEffect" }>;
  sourceInstanceId: string;
  sourceCardId: string;
  sourcePermanentId?: string;
  trigger?: string;
}): BorrowableEffect[] {
  const ordinals = new Map<string, number>();
  const out: BorrowableEffect[] = [];
  for (const effect of args.compiled.effects) {
    if (!args.action.fromTriggers.includes(effect.trigger) || effect.isSecurity === true) continue;
    if (args.trigger !== undefined && effect.trigger !== args.trigger) continue;
    const triggerOrdinal = ordinals.get(effect.trigger) ?? 0;
    ordinals.set(effect.trigger, triggerOrdinal + 1);
    out.push({
      effect,
      sourceInstanceId: args.sourceInstanceId,
      sourceCardId: args.sourceCardId,
      sourcePermanentId: args.sourcePermanentId,
      triggerOrdinal,
    });
  }
  return out;
}

/**
 * Collect the foreign cards whose compiled [On Play], [When Digivolving], or [On Deletion] effects this card
 * may borrow, from the requested zone, filtered by `filter`. Only face-up cards qualify
 * (a face-down security card / flipped digivolution card has no readable effect; source
 * `!cardSource.IsFlipped`). A card with no matching borrowable effect is skipped.
 */
function collectForeignCandidates(
  ctx: EffectContext,
  action: Extract<Action, { kind: "ActivateForeignEffect" }>,
): ForeignCandidate[] {
  const mine = ctx.source.ownerSeat;
  const seat = action.filter.controller === "opponent" ? ctx.game.opponentOf(mine) : mine;
  const player = ctx.game.player(seat);

  const sources: { instanceId: string; cardId: string; permanentId?: string }[] = [];
  if (action.zone === "security") {
    for (const card of player.security)
      if (card.faceUp) sources.push({ instanceId: card.instanceId, cardId: card.cardId });
  } else if (action.zone === "digivolutionCards") {
    // The activating Digimon's OWN digivolution stack (EX8-054: "in this Digimon's
    // digivolution cards"). A flipped (face-down) stack card is excluded unless it is the
    // card just placed by the preceding cost of a lastPlacedOnly activation (BT15-102).
    const self = ctx.source.permanent();
    if (self !== undefined) {
      for (const card of self.stack)
        if (
          card.faceUp ||
          (action.lastPlacedOnly === true && (ctx.lastPlacedUnderInstanceIds ?? []).includes(card.instanceId))
        )
          sources.push({ instanceId: card.instanceId, cardId: card.cardId });
    }
  } else {
    // battleArea: a battle-area permanent's TOP card the right seat controls (BT24-102:
    // "1 of your [Olympos XII] trait Digimon").
    const selfPermanentId = ctx.source.permanent()?.permanentId;
    for (const permanent of player.battleArea) {
      if (action.filter.isSelfRef === true && permanent.permanentId !== selfPermanentId) continue;
      if (action.filter.boundRef !== undefined) {
        const bound = ctx.boundPlayed?.get(action.filter.boundRef);
        const selected = ctx.selections?.get(action.filter.boundRef);
        if ((bound === undefined || !bound.has(permanent.permanentId)) && selected !== permanent.permanentId) continue;
      }
      const top = permanent.topCard;
      if (top !== undefined)
        sources.push({ instanceId: top.instanceId, cardId: top.cardId, permanentId: permanent.permanentId });
    }
  }

  const out: ForeignCandidate[] = [];
  for (const src of sources) {
    if (action.lastPlacedOnly === true && !(ctx.lastPlacedUnderInstanceIds ?? []).includes(src.instanceId)) continue;
    const def = ctx.game.definitionOf({ cardId: src.cardId } as never);
    if (def === undefined) continue;
    if (!definitionMatches(action.filter, def as unknown as DefinitionFacts)) continue;
    const compiled = runtimeCompiledCard(src.cardId);
    if (compiled === undefined) continue;
    // Borrowable = an [On Play]/[When Digivolving]/[On Deletion] effect (security effects are never
    // borrowable, source `!cardEffect.IsSecurityEffect`). Succession and sibling stack-effect
    // conferrals contribute their matching effects to the host as well (BT24-102/Q6945).
    const borrowable = borrowableFromCompiled({
      compiled,
      action,
      sourceInstanceId: src.instanceId,
      sourceCardId: src.cardId,
      sourcePermanentId: src.permanentId,
    });
    if (src.permanentId !== undefined) {
      const permanent = ctx.game.permanentById(src.permanentId);
      for (const conferral of ctx.fx.stackEffectConferrals?.() ?? []) {
        if (conferral.targetPermanentId !== src.permanentId || conferral.inheritedOnly === true) continue;
        const stackCard = permanent?.stack.find((card) => card.instanceId === conferral.stackInstanceId);
        if (stackCard === undefined) continue;
        const stackCompiled = runtimeCompiledCard(stackCard.cardId);
        if (stackCompiled === undefined) continue;
        borrowable.push(
          ...borrowableFromCompiled({
            compiled: stackCompiled,
            action,
            sourceInstanceId: stackCard.instanceId,
            sourceCardId: stackCard.cardId,
            sourcePermanentId: src.permanentId,
            trigger: conferral.trigger,
          }),
        );
      }
    }
    const available = availableBorrowedEffects(
      ctx,
      borrowable,
      action.zone === "digivolutionCards" ? ctx.source.permanent()?.permanentId : undefined,
    );
    if (available.length === 0) continue;
    out.push({ instanceId: src.instanceId, cardId: src.cardId, permanentId: src.permanentId, borrowable: available });
  }
  return out;
}

/**
 * Activate a NAMED other card's [On Play]/[When Digivolving] effect AS this Digimon's
 * effect (BT23-060 / BT24-102 / EX8-054). Server-authoritative: the engine enumerates
 * the eligible foreign cards, prompts the controller to pick one (and, when the chosen
 * card has more than one borrowable effect, which effect), then runs the borrowed
 * effect(s) under the ACTIVATING card's control/timing — `ctx.source` stays this card,
 * so controller-relative targets ("your opponent's Digimon") resolve from the activating
 * card's owner (source `selectedEffect.SetIsDigimonEffect(true)` + the activating card's
 * hashtable). The client never supplies the effect body; it only chooses among the
 * engine-resolved candidates (threat T-04-14).
 */
export async function runActivateForeignEffect(
  ctx: EffectContext,
  action: Extract<Action, { kind: "ActivateForeignEffect" }>,
): Promise<void> {
  const candidates = collectForeignCandidates(ctx, action);
  if (candidates.length === 0) return;

  // Pick WHICH foreign card lends its effect.
  let chosen: ForeignCandidate | undefined;
  if (candidates.length === 1) {
    chosen = candidates[0];
  } else {
    const picked = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map((c) => c.instanceId),
      min: 1,
      max: 1,
    });
    chosen = candidates.find((c) => c.instanceId === picked[0]);
  }
  if (chosen === undefined) return;

  // When the chosen card has multiple borrowable effects, the controller picks which one
  // (source's second select over the candidate effects). With exactly one, auto-resolve.
  let toRun: BorrowableEffect[];
  if (chosen.borrowable.length <= 1) {
    toRun = chosen.borrowable;
  } else {
    const labels = chosen.borrowable.map((entry) => describeEffect(entry.effect));
    const idx = await ctx.ask.chooseOption(ctx, labels);
    const picked = chosen.borrowable[idx];
    toRun = picked ? [picked] : [];
  }

  // Run the borrowed effect(s) as THIS card's effect (ctx.source unchanged). The borrowed
  // CardEffect resolves through the same `runEffect` path the original card would use, but
  // bound to the activating card's source — so timing, control and targeting are this
  // Digimon's, not the lender's.
  let runCtx = ctx;
  if (action.useLenderAsSource === true && chosen.permanentId !== undefined) {
    const permanentId = chosen.permanentId;
    const definition = ctx.game.definitionOf({ cardId: chosen.cardId } as never);
    runCtx = {
      ...ctx,
      source: {
        instanceId: chosen.instanceId,
        cardId: chosen.cardId,
        ownerSeat: ctx.source.ownerSeat,
        definition,
        permanent: () => ctx.game.permanentById(permanentId),
        isOnBattleArea: () => ctx.game.permanentById(permanentId) !== undefined,
        isOwnersTurn: () => ctx.game.state.turnSeat === ctx.source.ownerSeat,
        hasColor: (color) => definition.colors.includes(color),
      },
    };
  }
  // A Q5331 override belongs only to the matching borrowed lender/effect. Clear any inherited
  // marker at the loop boundary, then seed it per item so another eligible Zaxon On Play lender
  // selected by this same activation retains its ordinary optional/source behavior.
  runCtx = {
    ...runCtx,
    borrowedEffectOverrides: undefined,
  };
  const lenderIsEffectiveSource = action.useLenderAsSource === true && chosen.permanentId !== undefined;
  if (lenderIsEffectiveSource) {
    runCtx.fx.enterEffectResolution?.(
      runCtx.source.ownerSeat,
      [...(runCtx.source.definition.kinds ?? [])],
      runCtx.source.permanent()?.permanentId,
    );
  }
  try {
    for (const borrowed of toRun.slice(0, action.count)) {
      const eff = borrowed.effect;
      const borrowedEffectOverrides =
        action.borrowedEffectOverrides?.sourceCardId === borrowed.sourceCardId &&
        action.borrowedEffectOverrides.trigger === eff.trigger
          ? action.borrowedEffectOverrides
          : undefined;
      await runEffect(
        {
          ...runCtx,
          borrowedEffectOverrides,
          activeTiming: eff.trigger,
          activeEffectText: eff.description ?? describeEffect(eff),
        },
        eff,
      );
      const registered = registeredBorrowedEffect(ctx, borrowed);
      if (registered !== undefined && registered.maxPerTurn > 0) {
        ctx.usage?.register(borrowed.sourceInstanceId, registered.effectKey);
      }
    }
  } finally {
    if (lenderIsEffectiveSource) runCtx.fx.leaveEffectResolution?.();
  }
}

const BORROWABLE_EFFECT_TRIGGERS: readonly EffectTrigger[] = [
  "OnPlay",
  "WhenDigivolving",
  "OnDeletion",
  "OnDestroyedAnyone",
];

function optionUseCommitted(ctx: EffectContext): boolean {
  return ctx.lastOptionUsed === true;
}

export async function runActivateEffect(
  ctx: EffectContext,
  action: Extract<Action, { kind: "ActivateEffect" }>,
): Promise<void> {
  const trigger = action.effectType;
  if (action.target === undefined || !BORROWABLE_EFFECT_TRIGGERS.includes(trigger as EffectTrigger)) {
    unsupported(ctx, action, `legacy ActivateEffect payload is not specific enough to normalize`);
    return;
  }
  const filter = { ...(action.target.filter ?? {}) };
  if (filter.controller === undefined && filter.controllerDefault !== undefined) {
    filter.controller = filter.controllerDefault;
  }
  const targetCount = typeof action.target.count === "number" ? action.target.count : 1;
  await runActivateForeignEffect(ctx, {
    ...action,
    kind: "ActivateForeignEffect",
    zone: filter.zone === "digivolutionCards" ? "digivolutionCards" : "battleArea",
    fromTriggers: [trigger as EffectTrigger],
    filter,
    count: action.count ?? targetCount,
    lastPlacedOnly: action.lastPlacedOnly,
    useLenderAsSource: action.useLenderAsSource,
  });
}

/**
 * "Use 1 [Option] card from your hand without paying the cost" (EX8-037 / BT15-092 / BT16-094 /
 * BT19-040). Server-authoritative and a sibling of `runActivateForeignEffect`: the engine
 * enumerates the eligible Options server-side, prompts the controller to pick WHICH one (the use
 * is optional — source `canNoSelect: true`), then hands off to `ctx.fx.useOptionFromHand`,
 * which resolves that Option's [Main] effect under the USING card's control/timing (`ctx.source`
 * unchanged).
 * The client supplies only the choice among the engine-resolved candidates — never an effect body
 * (threat T-08-10/11). Eligibility (single-color, cost-<=5, not under a CanNotPlayThisOption
 * restriction) is the SERVER predicate (T-08-11). The Option is not a permanent, so it resolves
 * then goes to trash (the `playInstances` `isPermanentKind` gap). The use RESULT binds on
 * `ctx.lastOptionUsed` at use-time (KB EX8-037 Q4738) so an `ifThisEffectUsed` tail can gate.
 */
function optionUseCandidates(
  ctx: EffectContext,
  action: Extract<Action, { kind: "UseOptionWithoutCost" }>,
  includePayableCostCards = false,
): { candidates: string[]; zones: ZoneRef[]; seat: Seat } {
  const seat = ctx.source.ownerSeat;
  const zones: ZoneRef[] =
    (action.from?.length ?? 0) > 0
      ? (action.from as ZoneRef[])
      : (action.target?.from?.length ?? 0) > 0
        ? (action.target!.from as ZoneRef[])
        : (["hand"] as ZoneRef[]);
  const filter = (action as { filter?: Filter }).filter ?? action.target?.filter;
  const exactCosts = filter?.playCostOneOf ?? [];
  const attackerLevelCap =
    filter?.playCostLteAttackerLevel === true
      ? (() => {
          const attackerId = ctx.trigger.attackerPermanentId;
          const attacker = attackerId === undefined ? undefined : ctx.game.permanentById(attackerId);
          return attacker?.topCard === undefined ? undefined : ctx.game.definitionOf(attacker.topCard).level;
        })()
      : undefined;
  const scaledCostCap =
    filter?.playCostLteScaling === undefined
      ? undefined
      : (filter.playCostLte ?? 0) + scaleFactor(ctx, filter.playCostLteScaling);
  const dynamicCostCap =
    action.playCostCeiling === undefined
      ? undefined
      : action.playCostCeiling.base +
        scaleFactor(ctx, {
          per: action.playCostCeiling.per,
          filter: action.playCostCeiling.filter,
          unit: action.playCostCeiling.unit,
        }) *
          action.playCostCeiling.raise;
  const costCap =
    dynamicCostCap ??
    attackerLevelCap ??
    scaledCostCap ??
    filter?.playCostLte ??
    (exactCosts.length > 0 ? Math.max(...exactCosts) : 5);
  const candidates: string[] = [];
  const addIfEligible = (candidate: { instanceId: string; cardId: string }) => {
    if (candidates.includes(candidate.instanceId)) return;
    const def = ctx.game.definitionOf({ cardId: candidate.cardId } as never);
    const effectiveFilter =
      filter === undefined ? undefined : { ...filter, playCostLte: costCap, playCostLteScaling: undefined };
    if (effectiveFilter !== undefined && !definitionMatches(effectiveFilter, def)) return;
    if (!def.kinds.includes(CardKind.Option)) return;
    if (action.allowMultiColor !== true && def.colors !== undefined && def.colors.length !== 1) return;
    if (def.playCost > costCap) return;
    if (
      action.waiveColorRequirement !== true &&
      ctx.game.optionColorRequirementMet?.(seat, candidate.instanceId, def) === false
    )
      return;
    if (ctx.fx.isPlayProhibited?.(seat, candidate.cardId, "play") === true) return;
    candidates.push(candidate.instanceId);
  };
  for (const zone of zones) {
    const zoneCandidates =
      action.target === undefined
        ? looseCardsInZone(ctx, seat, zone)
        : candidateLooseInstances(ctx, action.target, [zone]);
    for (const candidate of zoneCandidates) {
      addIfEligible(candidate);
    }
  }
  // Some "by trashing ..." costs can put the Option to be used into the requested
  // trash zone (BT26-070 Q7092). Before the cost is paid, treat only an actually
  // payable bottom card as a prospective candidate. This preserves that valid flow
  // without consuming unrelated stack cards when neither the trash nor the cost can
  // supply a legal Option.
  if (
    includePayableCostCards &&
    zones.includes("trash") &&
    action.cost?.controller !== "opponent" &&
    (action.cost?.kind === "trashBottomFaceDownUnderTamer" || action.cost?.kind === "trashBottomFaceDownUnderDigimon")
  ) {
    const required = action.cost.count ?? 1;
    const requiredHostKind = action.cost.kind === "trashBottomFaceDownUnderTamer" ? CardKind.Tamer : CardKind.Digimon;
    const bottomCards = ctx.game
      .player(seat)
      .battleArea.filter(
        (permanent) =>
          permanent.topCard !== undefined &&
          ctx.game.definitionOf(permanent.topCard).kinds.includes(requiredHostKind) &&
          permanent.stack[0]?.faceUp === false,
      )
      .map((permanent) => permanent.stack[0]!);
    if (bottomCards.length >= required) bottomCards.forEach(addIfEligible);
  }
  // A normal digivolution-card trash cost can likewise create the requested
  // trash-zone Option candidate (BT25-083 Q6395). Preflight the payable stack
  // pool so the cost-bearing action is offered when the trash starts empty;
  // after payment, normal trash-zone enumeration still chooses the Option.
  if (
    includePayableCostCards &&
    zones.includes("trash") &&
    action.cost?.kind === "trash" &&
    action.cost.target?.filter.zone === "digivolutionCards"
  ) {
    const costCandidates = candidateLooseInstances(ctx, action.cost.target, ["digivolutionCards"]);
    const required = action.cost.target.count === "all" ? costCandidates.length : (action.cost.target.count ?? 1);
    if (required > 0 && costCandidates.length >= required) costCandidates.forEach(addIfEligible);
  }
  return { candidates, zones, seat };
}

export async function canAttemptUseOptionWithoutCost(
  ctx: EffectContext,
  action: Extract<Action, { kind: "UseOptionWithoutCost" }>,
): Promise<boolean> {
  const candidates = optionUseCandidates(ctx, action, true).candidates;
  if (candidates.length === 0) return false;
  if (action.payCost !== true || ctx.fx.canAffordEffectPlay === undefined) return true;
  const dynamicReduction =
    action.reduceCostByOpponentMemory === true
      ? Math.max(0, new MemoryGauge(ctx.game.state).memoryFor(ctx.game.opponentOf(ctx.source.ownerSeat)))
      : 0;
  const costDelta = (action.reduceCostBy ?? 0) + dynamicReduction;
  const affordability = await Promise.all(
    candidates.map((instanceId) =>
      ctx.fx.canAffordEffectPlay!(instanceId, {
        costDelta,
        useAsOption: true,
        controllerSeat: ctx.source.ownerSeat,
      }),
    ),
  );
  return affordability.some(Boolean);
}

export async function runUseOptionWithoutCost(
  ctx: EffectContext,
  action: Extract<Action, { kind: "UseOptionWithoutCost" }>,
): Promise<void> {
  // Bind the use OUTCOME on ctx up-front: false until an Option is actually used (read by a
  // subsequent "if this effect used" Condition; KB EX8-037 Q3923/Q4737).
  ctx.lastOptionUsed = false;
  ctx.lastOptionUsedInstanceId = undefined;

  const { candidates, zones, seat } = optionUseCandidates(ctx, action);
  if (candidates.length === 0) return;

  // The controller picks WHICH eligible Option (the use is optional: min 0). The client can only
  // name an engine-offered candidate; it never injects an effect.
  const picked = await ctx.ask.selectCards(ctx, { candidates, min: action.selectionRequired === true ? 1 : 0, max: 1 });
  const chosenId = picked[0];
  if (chosenId === undefined || !candidates.includes(chosenId)) return;

  // Fetch the chosen Option's compiled [Main] effect SERVER-SIDE and run it under THIS card's
  // control (ctx.source unchanged — same pattern as the borrowed-effect run). Options carry their
  // active effect on the `Main` trigger.
  // Resolve the pick from the SAME zone set used to build the candidates — `action.from` may name
  // a non-hand zone (e.g. ["trash"]), so retrieving from "hand" only would drop a non-hand pick's
  // borrowed effect while still trashing the card and setting lastOptionUsed (WR-02).
  const chosenCard = zones
    .flatMap((z) => looseCardsInZone(ctx, seat, z as ZoneRef))
    .find((c) => c.instanceId === chosenId);

  // The shared use verb owns payment so play-cost restrictions and insufficient-memory checks
  // run exactly once. Fold both printed reductions into its signed cost delta.
  const dynamicReduction =
    action.reduceCostByOpponentMemory === true
      ? Math.max(0, new MemoryGauge(ctx.game.state).memoryFor(ctx.game.opponentOf(seat)))
      : 0;
  const totalReduction = (action.reduceCostBy ?? 0) + dynamicReduction;

  // Effect resolution + lifecycle (trash the Option, fire whenOptionUsed) both now live behind
  // `ctx.fx.useOptionFromHand` (primitives.ts), which resolves the chosen card's registered
  // EffectModule for EffectTiming.OnUseOption itself — via the shared registry, so it covers a
  // hand-written module too, not just IR-compiled ones (the old inline `getCompiledCard` +
  // `runEffect` here never ran a hand-written Option's effect). Bind the use result TRUE at
  // use-time — Q4738: bound even if the Option's effect digivolved the source away. Carry the
  // Option's ORIGINAL use cost so a whenOptionUsed watcher can gate on "a cost of 2 or more"
  // (BT19-040; KB Q5471-Q5473 read the cost itself, not the paid/reduced value).
  const usedCost = chosenCard ? ctx.game.definitionOf({ cardId: chosenCard.cardId } as never).playCost : undefined;
  const effectiveUseCost = Math.max(0, (usedCost ?? 0) - totalReduction);
  let paymentHandled = false;
  // The concrete primitive owns payment in production. Lightweight interpreter doubles used
  // by mechanism tests do not expose that lifecycle seam, so charge through the context's
  // memory hook there to keep the action contract observable without double-paying live games.
  if (action.payCost === true && effectiveUseCost > 0 && ctx.fx.resolveCardEffect === undefined) {
    const payer = ctx.fx.gainMemoryForSeat;
    if (payer === undefined) return;
    payer(ctx.source.ownerSeat, -effectiveUseCost);
    paymentHandled = true;
  }
  await ctx.fx.useOptionFromHand(ctx, chosenId, usedCost, {
    payCost: action.payCost,
    ...(totalReduction > 0 ? { costDelta: totalReduction } : {}),
    ...(paymentHandled ? { paymentHandled: true } : {}),
  });
  if (!optionUseCommitted(ctx)) return;
  ctx.lastOptionUsedInstanceId = chosenId;
}

/**
 * "Activate this card's [Main] effect" — run the source card's own [Main]-timing
 * effect from the current (non-main) context (the common [Security] "activate this
 * card's [Main] effect" form). Looks up the compiled record and runs every Main
 * effect's actions through the interpreter. A loud gap when the card has no compiled
 * [Main] effect (so a silent no-op cannot hide a missing main ability).
 */
export async function runActivateMain(ctx: EffectContext): Promise<void> {
  const compiled = runtimeCompiledCard(ctx.source.cardId);
  const mains = (compiled?.effects ?? []).filter((e) => e.trigger === "Main" && !e.isSecurity);
  if (mains.length === 0) {
    unsupported(ctx, { kind: "ActivateMain" }, `ActivateMain found no [Main] effect on ${ctx.source.cardId}`);
    return;
  }
  // A DUAL Digimon directly activating its Option-side [Main] produces an Option effect,
  // not a Digimon effect (BT25-104 Q6496-Q6498). Narrow the physical dual definition only
  // for this borrowed Main body so source-kind-qualified immunity sees the correct face.
  const sourceKinds = ctx.source.definition.kinds;
  const activatesDualOptionFace = sourceKinds.includes(CardKind.Digimon) && sourceKinds.includes(CardKind.Option);
  const mainCtx = activatesDualOptionFace ? { ...ctx, effectSourceKinds: [CardKind.Option] } : ctx;
  if (activatesDualOptionFace) {
    ctx.fx.enterEffectResolution?.(ctx.source.ownerSeat, [CardKind.Option], ctx.source.permanent()?.permanentId);
  }
  try {
    for (const effect of mains) await runEffect(mainCtx, effect);
  } finally {
    if (activatesDualOptionFace) ctx.fx.leaveEffectResolution?.();
  }
}
