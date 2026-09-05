// Memory, deck draw, and cost modification.

import type { EffectContext } from "../../EffectContext.js";
import { type ActionScope, runAction } from "../dispatch.js";
import { DefinitionFacts, definitionMatches } from "../matching/definition.js";
import { permanentMatchesFilter, seatsForController } from "../matching/permanent.js";
import { countMatching, scaleFactor } from "../scaling.js";
import { toDuration } from "../duration.js";
import { evaluateCondition } from "../conditions.js";
import { payCost } from "../costs.js";
import { describeCost } from "../describe.js";
import { candidateLooseInstances, pickLoose } from "../targeting/loose.js";
import { candidatePermanents, resolvePermanentTargets } from "../targeting/permanents.js";
import { unsupported } from "../errors.js";
import { CardKind } from "@aegis/shared";
import type { Action, CardDefinition, Permanent, Seat, Target } from "@aegis/shared";

export async function runResourceAction(ctx: EffectContext, action: Action, scope: ActionScope): Promise<boolean> {
  const { scale } = scope;
  switch (action.kind) {
    case "Draw": {
      const seats: Seat[] =
        action.controller === "both"
          ? [ctx.source.ownerSeat, ctx.game.opponentOf(ctx.source.ownerSeat)]
          : action.controller === "opponent"
            ? [ctx.game.opponentOf(ctx.source.ownerSeat)]
            : [ctx.source.ownerSeat];
      let drewAny = false;
      for (const seat of seats) {
        const requested =
          action.untilHandSize === undefined
            ? scale === undefined
              ? action.amount
              : action.amount * scale
            : Math.max(0, action.untilHandSize - ctx.game.player(seat).hand.length);
        const drawn = await ctx.fx.draw(seat, requested);
        drewAny ||= drawn.length > 0;
      }
      // Bind "If you do" to an ACTUAL draw. Drawing from an empty deck does not satisfy the
      // clause (ST10-01), while one or more cards drawn does and enables the following action.
      ctx.lastEffectActed = drewAny;
      return false;
    }
    case "GainMemory": {
      const amount = scale === undefined ? action.amount : action.amount * scale;
      ctx.lastMemoryGainAmount = amount;
      const seat = ctx.source.ownerSeat;
      if (action.at === "endOfTurn") {
        // Deferred one-shot ("at the end of your turn, lose 3 memory" — BT1-021). Installed
        // anchor-less so it still fires if this source is deleted first (KB Q882/Q883).
        ctx.fx.delayedGainMemory?.(seat, amount);
        return false;
      }
      // A Tamer temporarily treated as a Digimon remains a Tamer for this exception
      // (KB Q6381 / BT25-079). Read effective kinds from the live permanent when the
      // source is on the field; loose/security sources fall back to printed kinds.
      const sourcePermanent = ctx.source.permanent();
      const effectiveSourceKinds =
        sourcePermanent === undefined
          ? ctx.source.definition.kinds
          : (ctx.game.effectiveKinds?.(sourcePermanent.permanentId) ?? ctx.source.definition.kinds);
      ctx.fx.gainMemoryForSeat(seat, amount, {
        isTamerEffect: effectiveSourceKinds.includes(CardKind.Tamer),
      });
      return false;
    }
    case "PayMemoryUpTo": {
      const maximum = Math.min(action.maxMemory, Math.max(0, ctx.game.state.memory));
      const paid = await ctx.ask.chooseOption(
        ctx,
        Array.from({ length: maximum + 1 }, (_, amount) => `Pay ${amount} memory`),
      );
      if (paid > 0) {
        ctx.fx.gainMemoryForSeat(ctx.source.ownerSeat, -paid);
        const targets = await resolvePermanentTargets(ctx, action.target);
        for (const permanentId of targets) {
          ctx.fx.modifyDP(permanentId, paid * action.amount, toDuration(action.duration));
        }
      }
      return false;
    }
    case "SetMemory": {
      if (action.controller === undefined) {
        ctx.fx.setMemory(action.value);
        return false;
      }
      const seat = action.controller === "mine" ? ctx.source.ownerSeat : ctx.game.opponentOf(ctx.source.ownerSeat);
      if (ctx.fx.setMemoryForSeat === undefined) {
        unsupported(ctx, action, "SetMemory targeted at a specific seat has no memory-seat primitive");
        return false;
      }
      ctx.fx.setMemoryForSeat(seat, action.value);
      return false;
    }
    case "SetTurnEndMemory":
      ctx.fx.setTurnEndMinMemory?.(ctx.source.ownerSeat, action.minimum);
      return false;
    case "TrashTopDeck": {
      // No dedicated "mill" primitive; reveal then trash the revealed top N.
      const seats: Seat[] =
        action.controller === "both"
          ? [ctx.source.ownerSeat, ctx.game.opponentOf(ctx.source.ownerSeat)]
          : action.controller === "opponent"
            ? [ctx.game.opponentOf(ctx.source.ownerSeat)]
            : [ctx.source.ownerSeat];
      let totalTrashed = 0;
      const maximum = action.amount * (scale ?? 1);
      const minimum = Math.min(action.minimum ?? maximum, maximum);
      const amount =
        action.upTo === true && minimum < maximum
          ? minimum +
            (await ctx.ask.chooseOption(
              ctx,
              Array.from(
                { length: maximum - minimum + 1 },
                (_, index) => `Trash ${minimum + index} card${minimum + index === 1 ? "" : "s"}`,
              ),
            ))
          : maximum;
      for (const seat of seats) {
        const revealed = await ctx.fx.reveal(seat, amount);
        if (revealed.length > 0) {
          const ids = revealed.map((c) => c.instanceId);
          await ctx.fx.trash(ids, { byEffectSeat: ctx.source.ownerSeat });
          totalTrashed += ids.length;
          await ctx.fx.fireOnDiscardLibrary(seat, ids);
          // Fire whenTrashedFromDeck once per trashed card so a card-specific watcher
          // (BT19-097 "when THIS card is trashed from the deck") can match by card ID.
          for (const card of revealed) {
            await ctx.fx.fireWhenTrashedFromDeck(card.cardId, card.instanceId, ctx.source.cardId);
          }
        }
      }
      if (action.trackCount !== undefined) {
        ctx.namedCounts ??= new Map();
        ctx.namedCounts.set(action.trackCount, totalTrashed);
      }
      return false;
    }
    case "ReducePlayCost": {
      // Pay-time interactive cost reduction (EX9-043 / BT25-076), resolved SERVER-SIDE inside the
      // in-hand card's BeforePayCost window. The payment is OPTIONAL: offer it,
      // execute it in the engine, then bind the earned delta on ctx.playCostDelta (accumulated, so
      // multiple BeforePayCost effects on one card compose). The client never supplies the delta —
      // it is computed from what the engine actually trashed/deleted (T-08-26).
      const payment = action.payment;
      if (!payment) return false;
      if (payment.kind === "automatic") {
        if (!evaluateCondition(ctx, payment.condition)) return false;
        const scaleFactorValue = action.scaling === undefined ? 1 : scaleFactor(ctx, action.scaling);
        const delta = action.amount.kind === "fixed" ? action.amount.value * scaleFactorValue : 0;
        ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, delta);
        return false;
      }
      if (payment.kind === "payCost") {
        if (!(await ctx.ask.optional(ctx, `Pay cost: ${describeCost(payment.cost)}?`))) return false;
        if (!(await payCost(ctx, payment.cost))) return false;
        const delta = action.amount.kind === "fixed" ? action.amount.value : 0;
        ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, delta);
        return false;
      }
      if (payment.kind === "returnFromTrashToDeckTop") {
        const candidates = candidateLooseInstances(ctx, payment.target, ["trash"]);
        const count = payment.target.count === "all" ? candidates.length : payment.target.count;
        if (candidates.length < count) return false;
        if (!(await ctx.ask.optional(ctx, `Return ${count} cards to reduce the play cost`))) return false;
        const chosen = await pickLoose(ctx, payment.target, candidates);
        if (chosen.length !== count) return false;
        await ctx.fx.returnToDeck(chosen, { toTop: true });
        const delta = action.amount.kind === "fixed" ? action.amount.value : 0;
        ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, delta);
        return false;
      }
      if (payment.kind === "trashSecurityTopUpToLeave") {
        const seat = ctx.source.ownerSeat;
        const maximum = Math.max(0, ctx.game.player(seat).security.length - payment.leaveCount);
        let paid = 0;
        while (paid < maximum && (await ctx.ask.optional(ctx, "Trash the top security card to reduce the cost"))) {
          const moved = await ctx.fx.trashFromSecurity(seat, 1, { fromTop: true });
          if (moved.length === 0) break;
          paid += moved.length;
        }
        const delta = action.amount.kind === "perPaid" ? action.amount.value * paid : 0;
        ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, delta);
        return false;
      }
      if (payment.kind === "trashFromHand") {
        // "By trashing 1 [Cyborg]/[Ver.5] card from your hand" — an optional hand discard. The card
        // being played is itself still in hand at this BeforePayCost window; exclude it so it cannot
        // be its own trash payment (it carries the [Cyborg]/[Ver.5] trait too).
        const trashTarget: Target = { filter: { ...payment.filter, zone: "hand" }, count: 1, upTo: true };
        const candidates = candidateLooseInstances(ctx, trashTarget, ["hand"]).filter(
          (c) => c.instanceId !== ctx.source.instanceId,
        );
        if (candidates.length === 0) return false;
        if (!(await ctx.ask.optional(ctx, "Trash 1 card to reduce the play cost"))) return false;
        const chosen = await pickLoose(ctx, trashTarget, candidates);
        if (chosen.length === 0) return false;
        await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
        const delta = action.amount.kind === "fixed" ? action.amount.value : 0;
        ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, delta);
        return false;
      }
      if (payment.kind === "trashDigivolution") {
        const hosts = candidatePermanents(ctx, payment.target)
          .filter((permanent) => permanent.stack.length >= payment.minimum)
          .map((permanent) => permanent.permanentId);
        if (hosts.length === 0 || !(await ctx.ask.optional(ctx, "Trash digivolution cards to reduce the play cost")))
          return false;
        const chosenHosts =
          hosts.length === 1 ? hosts : await ctx.ask.chooseTargets(ctx, { candidates: hosts, min: 1, max: 1 });
        const host = chosenHosts[0] === undefined ? undefined : ctx.game.permanentById(chosenHosts[0]);
        if (host === undefined || host.stack.length < payment.minimum) return false;
        const max = host.stack.length;
        const count =
          max === payment.minimum
            ? payment.minimum
            : payment.minimum +
              (await ctx.ask.chooseOption(
                ctx,
                Array.from({ length: max - payment.minimum + 1 }, (_, i) => `Trash ${payment.minimum + i}`),
              ));
        const ids = host.stack.slice(0, count).map((card) => card.instanceId);
        const moved = await ctx.fx.trashDigivolutionCards(host.permanentId, ids, {
          byEffectSeat: ctx.source.ownerSeat,
        });
        if (moved.length !== count) return false;
        const delta = action.amount.kind === "fixed" ? action.amount.value : 0;
        ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, delta);
        return false;
      }
      // sacrificePermanent: "By deleting 1 of your play-cost-≤11 [Negamon] Digimon" (BT25-076).
      // Capture the chosen permanent's PRINTED play cost BEFORE deleting it, so the dynamic delta
      // equals the sacrificed Digimon's cost.
      const sacTarget = payment.target;
      const sacCandidates = await resolvePermanentTargets(ctx, { ...sacTarget, upTo: true });
      if (sacCandidates.length === 0) return false;
      if (!(await ctx.ask.optional(ctx, "Delete 1 of your Digimon to reduce the play cost"))) return false;
      const chosenIds = await ctx.ask.chooseTargets(ctx, { candidates: sacCandidates, min: 1, max: 1 });
      if (chosenIds.length === 0) return false;
      const sacrificed = ctx.game.permanentById(chosenIds[0]!);
      const sacrificedCost =
        sacrificed?.topCard !== undefined ? ctx.game.definitionOf(sacrificed.topCard).playCost : undefined;
      const removed = await ctx.fx.deletePermanent(chosenIds);
      // Only earn the reduction if the sacrifice ACTUALLY happened (a prevented/immune target
      // gate). The dynamic delta is the deleted card's printed play cost (floored, -1 sentinel => 0).
      if (removed > 0 && sacrificedCost !== undefined) {
        const delta =
          action.amount.kind === "deletedSacrificePlayCost"
            ? Math.max(0, sacrificedCost)
            : Math.max(0, action.amount.value);
        ctx.playCostDelta = (ctx.playCostDelta ?? 0) + delta;
      }
      return false;
    }
    case "CostModifier": {
      if (action.amount === null && action.dynamicFrom === "deletedDigimonPlayCost") {
        unsupported(ctx, action, "dynamic deleted-Digimon play-cost modifier must be nested under wouldBePlayed");
        return false;
      }
      // Cost modification recorded in the cost-calculation layer (the play/digivolve cost
      // calc consults it). A scaled DELTA multiplies by the runtime count when known.
      // A SET mode records an absolute base cost (setFixed) computed BEFORE additive
      // deltas (KB BT7-040 Q1568): the SET value is the base, other reductions subtract
      // from it. The SET amount is the literal `amount` (e.g. P-116's 0) or the resolved
      // count when count-driven (BT7-040/BT7-100's security stack).
      const setMode = action.mode === "set";
      if (action.costType === "dpDeletion") {
        const amount =
          (scale === undefined ? action.amount : action.amount * scale) * (action.mode === "reduce" ? -1 : 1);
        const self = action.target?.isSelf || action.target?.filter?.isSelfRef ? ctx.source.permanent() : undefined;
        if (self !== undefined) {
          ctx.fx.addDeletionMaxDp?.({ permanentId: self.permanentId }, amount);
        } else {
          // EX2-010 Q3293 and EX2-011 Q3297: without a self target, the printed
          // maximum modifier applies to every DP-based deletion effect of the owner.
          ctx.fx.addDeletionMaxDp?.({ seat: ctx.source.ownerSeat }, amount);
        }
        return false;
      }
      // Level-ceiling modifiers are transient context for the following play action and do
      // not target a permanent. Handle them before the generic target requirement below;
      // otherwise valid effects such as PawnChessmon's conditional level increase silently
      // return without recording the delta.
      if (action.costType === "level") {
        let delta = action.amount;
        if (setMode) delta = scale !== undefined ? scale : action.amount;
        else if (scale !== undefined) delta = action.amount * scale;
        if (!setMode && action.mode === "reduce") delta = -Math.abs(delta);
        ctx.playLevelCeilingDelta = (ctx.playLevelCeilingDelta ?? 0) + delta;
        return false;
      }
      const want = action.target;
      if (!want) {
        if (
          action.costType === "digivolve" &&
          action.mode === "reduce" &&
          action.duration === "nextDigivolveThisTurn" &&
          action.cost?.kind === "trash"
        ) {
          const ownerSeat = ctx.source.ownerSeat;
          ctx.fx.subscribeReplacement({
            event: "wouldDigivolve",
            ...(ctx.activeEffectKey === undefined
              ? {}
              : { activationIdentity: `${ctx.activeEffectKey}/action-${ctx.activeActionPath ?? "unknown"}` }),
            mode: "reduceCost",
            amount: Math.abs(action.amount),
            controllerSeat: ownerSeat,
            appliesTo: (target: Permanent) =>
              target.controllerSeat === ownerSeat &&
              !target.inBreeding &&
              target.topCard !== undefined &&
              ctx.game.definitionOf(target.topCard).kinds.includes(CardKind.Digimon),
            activationContext: ctx,
            consumeOnActivate: true,
            expiresOnTurnEndOf: ownerSeat,
            description: action.raw ?? `Reduce the next digivolution cost by ${Math.abs(action.amount)}`,
            activate: async (runtimeCtx, target, _into, evolvingInstanceId, materials) => {
              if (target.controllerSeat !== ownerSeat || target.inBreeding) return false;
              const colors = new Set(
                (materials ?? [target]).flatMap(
                  (material) =>
                    runtimeCtx.game.effectiveColors?.(material) ??
                    runtimeCtx.game.definitionOf(material.topCard).colors,
                ),
              );
              const candidates = runtimeCtx.game.player(ownerSeat).hand.filter((card) => {
                if (card.instanceId === evolvingInstanceId) return false;
                const definition = runtimeCtx.game.definitionOf(card);
                return (
                  definition.kinds.includes(CardKind.Digimon) && definition.colors.some((color) => colors.has(color))
                );
              });
              if (candidates.length === 0) return false;
              if (!(await runtimeCtx.ask.optional(runtimeCtx, action.cost?.raw ?? "Pay the reduction cost?")))
                return false;
              const chosen = await runtimeCtx.ask.selectCards(runtimeCtx, {
                candidates: candidates.map((card) => card.instanceId),
                min: 1,
                max: 1,
              });
              if (chosen.length !== 1) return false;
              const trashed = await runtimeCtx.fx.trash(chosen, { byEffectSeat: ownerSeat });
              return trashed.length === 1;
            },
          });
        }
        return false;
      }
      const filter = want.filter ?? {};
      let delta = action.amount;
      if (setMode) {
        delta = scale !== undefined ? scale : action.amount;
      } else if (action.scaled && action.scaling === undefined) {
        const countFilter = { ...filter, controller: filter.controller ?? "mine" };
        delta = action.amount * countMatching(ctx, countFilter);
      } else if (scale !== undefined) {
        delta = action.amount * scale;
      }
      if (!setMode && action.mode === "reduce") {
        delta = -Math.abs(delta);
      }
      const modifierOpts:
        | {
            setFixed?: boolean;
            once?: boolean;
            continuous?: boolean;
            onConsume?: (match: { target: Permanent; into?: CardDefinition }) => void;
          }
        | undefined =
        setMode || action.once === true || action.onConsume !== undefined || action.restriction === "suspendThisTamer"
          ? {
              ...(setMode ? { setFixed: true } : {}),
              ...(action.once === true || action.restriction === "suspendThisTamer" ? { once: true } : {}),
              ...(action.duration === "permanent"
                ? { continuous: true }
                : action.duration !== undefined
                  ? { continuous: false }
                  : {}),
            }
          : undefined;
      const selfRef = want.isSelf || filter.isSelfRef;
      // A hand-resident digivolve-cost static (BT7-040) installs ONLY while its source
      // `card.Owner.HandCards.Contains(card)`) — the candidate sweep also visits trash
      // and face-up security, which must not arm the SET.
      if (action.handResident === true) {
        const inHand = ctx.game.player(ctx.source.ownerSeat).hand.some((c) => c.instanceId === ctx.source.instanceId);
        if (!inHand) return false;
      }
      if (action.costType === "digivolve") {
        // Digivolve-cost form: the predicate matches the base battle-area permanent being
        // digivolved, plus (when known) the card being digivolved INTO (`m.into`). The
        // digivolve flow reads it via changeEvoCost at cost-query time.
        //
        // A `selfRef` target has two distinct shapes, distinguished by where the source
        // currently lives:
        //   - HAND-RESIDENT (BT7-040 "when digivolving INTO this card from your hand"):
        //     the source is the digivolution TARGET sitting in hand, so it has no
        //     permanent. Match the digivolve whose `into` card IS this source card.
        //   - ON-FIELD self (a permanent's own "reduce my digivolve cost"): match the
        //     permanent that contains this source.
        const selfCardId = ctx.source.cardId;
        const predicate = (m: { target: Permanent; into?: CardDefinition }): boolean => {
          if (action.restriction === "suspendThisTamer") {
            const tamer = ctx.source.permanent();
            if (tamer === undefined || tamer.isSuspended || tamer.inBreeding) return false;
          }
          if (selfRef) {
            const self = ctx.source.permanent();
            if (self === undefined) {
              // Hand-resident target: the digivolve must be INTO this card AND driven by
              // the owner's own digivolve onto a permanent the owner controls (documented behavior
              // battle area). Requiring a known, matching `into` removes the latent
              // over-match where an unknown `into` clobbered unrelated digivolves; the live
              // digivolve site always supplies `into`. Without the owner-seat gate, one
              // player's installed hand-resident SET cost would corrupt the OTHER player's
              // digivolve into the same card id (CR-01).
              if (m.into === undefined || m.into.cardId !== selfCardId) return false;
              if (m.target.controllerSeat !== ctx.source.ownerSeat) return false;
              // Some hand-resident reducers constrain the BASE as well as the destination.
              // BT3-031, for example, reduces only when the Digimon being evolved is
              // Paildramon/Dinobeemon. Its sourceFilter also gates effect installation, but
              // that broad board-presence check alone would incorrectly let an unrelated
              // level 5 receive the discount while a matching Digimon sat beside it.
              if (
                action.sourceFilter !== undefined &&
                !permanentMatchesFilter(ctx, m.target, action.sourceFilter, ctx.source)
              ) {
                return false;
              }
              return true;
            }
            if (self.permanentId !== m.target.permanentId) return false;
            if (action.into !== undefined) {
              if (m.into === undefined) return false;
              if (!definitionMatches(action.into, m.into as unknown as DefinitionFacts)) return false;
            }
            return true;
          }
          // `action.into` scopes the reduction to only those digivolves whose destination card
          // (the card being digivolved into, still in hand) matches the filter (CAP-C-10,
          // BT2-088: "when digivolving a battle-area Digimon INTO a Tyrannomon-named card").
          // When `m.into` is absent (cost query without a known destination), conservatively
          // decline the reduction — the live digivolve site always supplies it.
          if (action.into !== undefined) {
            if (m.into === undefined) return false;
            if (!definitionMatches(action.into, m.into as unknown as DefinitionFacts)) return false;
          }
          return permanentMatchesFilter(ctx, m.target, filter, ctx.source);
        };
        if (modifierOpts !== undefined && action.restriction === "suspendThisTamer") {
          modifierOpts.onConsume = () => {
            const tamer = ctx.source.permanent();
            if (tamer !== undefined) ctx.fx.payActivationCost?.(tamer.permanentId, "suspend");
          };
        }
        if (modifierOpts !== undefined && action.onConsume !== undefined) {
          modifierOpts.onConsume = (match) => {
            const bindAs = action.consumeBindAs ?? "consumedCostTarget";
            ctx.fx.subscribeSubTrigger({
              event: "endOfTurn",
              sourcePermanentId: match.target.permanentId,
              once: true,
              description: action.raw ?? "cost modifier consumed",
              run: async (subCtx) => {
                const selections = new Map(subCtx.selections ?? []);
                selections.set(bindAs, match.target.permanentId);
                const runCtx: EffectContext = { ...subCtx, selections };
                for (const a of action.onConsume ?? []) {
                  const abort = await runAction(runCtx, a);
                  if (abort) break;
                }
              },
            });
          };
        }
        ctx.fx.changeEvoCost(predicate, delta, modifierOpts);
        return false;
      }
      // An interactive self-reduction resolved in the card's BeforePayCost window must
      // modify that imminent payment directly. Installing a continuous play-cost modifier
      // here is too late: the caller has already supplied the base cost and reads the earned
      // reduction back from this focused context (BT26-098).
      if (
        ctx.activeTiming === "BeforePayCost" &&
        action.handResident === true &&
        selfRef &&
        action.mode === "reduce" &&
        (action.costType === "play" || action.costType === "use")
      ) {
        ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.abs(delta);
        return false;
      }
      // Play/use-cost form ("reduce the play cost of your Digimon by N", "increase the
      // cost of your opponent's next Digimon by N"): the predicate matches card
      // DEFINITIONS (and the paying seat) rather than a board permanent, since the
      // affected card is still in hand when its cost is computed. The self form (this
      // card's own play/use cost) matches this source instance's card id for its owner.
      const seatsScope = seatsForController(ctx, filter);
      const selfCardId = ctx.source.cardId;
      if (action.existingPermanent === true) {
        const selected = await resolvePermanentTargets(ctx, want);
        for (const permanentId of selected) {
          ctx.fx.changePlayCost((facts) => facts.permanentId === permanentId, delta, {
            ...(setMode ? { setFixed: true } : {}),
            continuous: action.duration === "permanent",
          });
        }
        return false;
      }
      const predicate = (facts: { def: CardDefinition; controllerSeat: Seat }): boolean => {
        if (!seatsScope.includes(facts.controllerSeat)) return false;
        if (selfRef) {
          return facts.controllerSeat === ctx.source.ownerSeat && facts.def.cardId === selfCardId;
        }
        return definitionMatches(filter, facts.def as unknown as DefinitionFacts);
      };
      ctx.fx.changePlayCost(predicate, delta, setMode ? { setFixed: true } : undefined);
      return false;
    }
    default:
      // Unreachable: runAction routes only this family's kinds here, and its own default
      // reports anything the Action union does not cover.
      return false;
  }
}
