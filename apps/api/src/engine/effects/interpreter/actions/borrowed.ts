// Running another card's effect, or an Option, as an effect of this one.

import type { EffectContext } from "../../EffectContext.js";
import { runtimeCompiledCard } from "../compiledCards.js";
import { describeEffect } from "../describe.js";
import { runEffect } from "../dispatch.js";
import { unsupported } from "../errors.js";
import { DefinitionFacts, definitionMatches } from "../matching/definition.js";
import { looseCardsInZone } from "../targeting/loose.js";
import { CardKind } from "@aegis/shared";
import type { Action, CardEffect, EffectTrigger, Filter, ZoneRef } from "@aegis/shared";

/** A foreign card eligible to lend a borrowed effect (its instance + the borrowable effects). */
interface ForeignCandidate {
  instanceId: string;
  cardId: string;
  permanentId?: string;
  borrowable: CardEffect[];
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
    // digivolution cards"). A flipped (face-down) stack card is excluded.
    const self = ctx.source.permanent();
    if (self !== undefined) {
      for (const card of self.stack)
        if (card.faceUp) sources.push({ instanceId: card.instanceId, cardId: card.cardId });
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
    // borrowable, source `!cardEffect.IsSecurityEffect`).
    const borrowable = compiled.effects.filter((e) => action.fromTriggers.includes(e.trigger) && e.isSecurity !== true);
    if (borrowable.length === 0) continue;
    out.push({ instanceId: src.instanceId, cardId: src.cardId, permanentId: src.permanentId, borrowable });
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

  // A borrowed timing effect is still that permanent's timing effect for suppression
  // purposes. Venusmon therefore prevents Seiken Meppa from activating Jesmon GX's
  // [When Digivolving] effect (BT10-110 Q2039), even though the Option initiated it.
  if (
    chosen.permanentId !== undefined &&
    action.fromTriggers.includes("WhenDigivolving") &&
    (ctx.fx.isTimingEffectDisabled?.(chosen.permanentId, "whenDigivolving") ??
      ctx.game.isTimingEffectDisabled?.(chosen.permanentId, "whenDigivolving")) === true
  ) {
    return;
  }

  // When the chosen card has multiple borrowable effects, the controller picks which one
  // (source's second select over the candidate effects). With exactly one, auto-resolve.
  let toRun: CardEffect[];
  if (chosen.borrowable.length <= 1) {
    toRun = chosen.borrowable;
  } else {
    const labels = chosen.borrowable.map((e) => describeEffect(e));
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
  for (const eff of toRun.slice(0, action.count)) await runEffect(runCtx, eff);
}

const BORROWABLE_EFFECT_TRIGGERS: readonly EffectTrigger[] = ["OnPlay", "WhenDigivolving", "OnDeletion", "OnDestroyedAnyone"];

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
export async function runUseOptionWithoutCost(
  ctx: EffectContext,
  action: Extract<Action, { kind: "UseOptionWithoutCost" }>,
): Promise<void> {
  // Bind the use OUTCOME on ctx up-front: false until an Option is actually used (read by a
  // subsequent "if this effect used" Condition; KB EX8-037 Q3923/Q4737).
  ctx.lastOptionUsed = false;

  const seat = ctx.source.ownerSeat; // the printed form is always "from YOUR hand"
  // Resolve source zones: `action.from` (top-level) or `action.target.from` (wrapped form).
  const zones: ZoneRef[] =
    (action.from?.length ?? 0) > 0
      ? (action.from as ZoneRef[])
      : (action.target?.from?.length ?? 0) > 0
        ? (action.target!.from as ZoneRef[])
        : (["hand"] as ZoneRef[]);

  // Resolve the eligibility filter: top-level `action.filter` (BT19-040 / EX8-037) or
  // `action.target.filter` (BT10-039 / BT21-062 / BT24-085 / EX4-030 / ST22-07 / BT10-041).
  // EX2-060 has neither (a minimal "any Option" shape); undefined = no filter, all Options pass.
  const filter = (action as { filter?: Filter }).filter ?? action.target?.filter;

  // Cost cap: honor playCostLte from the resolved filter; fall back to 5 (historical EX8-037 default).
  const exactCosts = filter?.playCostOneOf ?? [];
  const costCap = filter?.playCostLte ?? (exactCosts.length > 0 ? Math.max(...exactCosts) : 5);
  // Server-side eligibility: a single-color Option within the cost cap matching the filter, not
  // under a CanNotPlayThisOption play restriction.
  const candidates: string[] = [];
  for (const zone of zones) {
    for (const cand of looseCardsInZone(ctx, seat, zone as ZoneRef)) {
      if (candidates.includes(cand.instanceId)) continue;
      const def = ctx.game.definitionOf({ cardId: cand.cardId } as never);
      if (filter !== undefined && !definitionMatches(filter, def)) continue;
      if (!def.kinds.includes(CardKind.Option)) continue;
      if (def.colors.length !== 1) continue;
      if (def.playCost > costCap) continue;
      if (ctx.fx.isPlayProhibited?.(seat, cand.cardId, "play") === true) continue;
      candidates.push(cand.instanceId);
    }
  }
  if (candidates.length === 0) return;

  // The controller picks WHICH eligible Option (the use is optional: min 0). The client can only
  // name an engine-offered candidate; it never injects an effect.
  const picked = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
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

  // Pay cost before running the effect (mirrors normal Option use flow). The ORIGINAL printed
  // cost is used for the whenOptionUsed watcher gate (KB Q5471-Q5473), not the reduced value.
  if (action.payCost === true && chosenCard !== undefined) {
    const chosenDef = ctx.game.definitionOf({ cardId: chosenCard.cardId } as never);
    const reducedCost = Math.max(0, chosenDef.playCost - (action.reduceCostBy ?? 0));
    if (reducedCost > 0) ctx.fx.gainMemory(-reducedCost);
  }

  // Effect resolution + lifecycle (trash the Option, fire whenOptionUsed) both now live behind
  // `ctx.fx.useOptionFromHand` (primitives.ts), which resolves the chosen card's registered
  // EffectModule for EffectTiming.OnUseOption itself — via the shared registry, so it covers a
  // hand-written module too, not just IR-compiled ones (the old inline `getCompiledCard` +
  // `runEffect` here never ran a hand-written Option's effect). Bind the use result TRUE at
  // use-time — Q4738: bound even if the Option's effect digivolved the source away. Carry the
  // Option's ORIGINAL use cost so a whenOptionUsed watcher can gate on "a cost of 2 or more"
  // (BT19-040; KB Q5471-Q5473 read the cost itself, not the paid/reduced value).
  const usedCost = chosenCard ? ctx.game.definitionOf({ cardId: chosenCard.cardId } as never).playCost : undefined;
  await ctx.fx.useOptionFromHand(ctx, chosenId, usedCost);
  ctx.lastOptionUsed = true;
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
  if (activatesDualOptionFace) ctx.fx.enterEffectResolution?.(ctx.source.ownerSeat, [CardKind.Option]);
  try {
    for (const effect of mains) await runEffect(mainCtx, effect);
  } finally {
    if (activatesDualOptionFace) ctx.fx.leaveEffectResolution?.();
  }
}
