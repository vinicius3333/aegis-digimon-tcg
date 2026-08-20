import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-091 — Yoshino Fujieda (BT26, Green Tamer).
 *
 * Q7144–Q7148 confirm bottom placement, immutable face-down stacking, visibility, face-up
 * trash handling, and that the reduced-cost effect may be activated even when another
 * effect prevents cost reduction.
 *
 * Printed text:
 *   [Start of Your Main Phase] By placing 1 [DATA SQUAD] trait card from your hand face
 *   down under this Tamer, <Draw 1> and gain 1 memory.
 *   [Your Turn] When any of your opponent's Digimon or Tamers suspend, or effects trash
 *   cards from under this Tamer, by suspending this Tamer, 1 of your Digimon may
 *   digivolve into a [Vegetation], [Fairy] or [DATA SQUAD] trait Digimon card in the
 *   hand with the cost reduced by 1.
 *   [Security] Play this card without paying the cost.
 *
 * Clause mapping:
 *   EffectTiming.OnStartMainPhase — cost-then-benefit, identically shaped to BT26-089's
 *     "[Start of Your Main Phase] By placing 1 [trait] card from your hand under this
 *     Tamer, Draw 1 and gain 1 memory." Placement uses ctx.fx.placeUnder (the existing
 *     "face down under a permanent" primitive). No new primitive needed.
 *
 *   EffectTiming.None — [Your Turn] static: installs TWO SubTrigger watchers anchored to
 *     this Tamer, mirroring BT26-089's/BT13-008's dual-watcher shape:
 *       - `whenSuspended` for "any of your opponent's Digimon or Tamers suspend"
 *         (matches BT13-008's own-Tamer-suspend watcher, gated on the opponent seat).
 *         Both effect suspension and combat's rules suspension publish this generic
 *         event; combat intentionally does not publish the effect-only sibling.
 *       - `whenEffectRemovesFromSecurity`'s sibling for the digivolution-stack side,
 *         `whenDigivolutionTrashed` (primitives.ts `trashDigivolutionCards` — the same
 *         event EX1-020/ST24-14 watch), for "effects trash cards from under this Tamer":
 *         cards placed face down under a Tamer via `ctx.fx.placeUnder` sit in the same
 *         `permanent.stack` digivolution-cards field that `trashDigivolutionCards`
 *         operates on, so an effect trashing them fires this event with this Tamer as
 *         the subject.
 *     Both watchers run the shared cost+benefit: "by suspending this Tamer" is the
 *     mandatory cost (paid whenever this Tamer is unsuspended and able), and "1 of your
 *     Digimon may digivolve into a [Vegetation]/[Fairy]/[DATA SQUAD] Digimon card in the
 *     hand with the cost reduced by 1" is the optional benefit — modeled on BT12-081's
 *     "digivolve into X ... for its digivolution cost -N" via
 *     `ctx.fx.digivolveFromInstance(target, source, { payCost: true, costDelta: -1 })`.
 *     Legality (the printed digivolve requirement between the chosen target and card) is
 *     enforced by `digivolveFromInstance` itself, which no-ops (returns undefined) on an
 *     illegal pairing — the same reliance BT9-098/BT12-081 place on it; there is no
 *     ctx-exposed pre-check for arbitrary target/card pairs, so a chosen combination that
 *     turns out illegal silently does nothing (still costs the mandatory suspend).
 *
 *   EffectTiming.SecuritySkill — [Security] Play this card without paying the cost.
 */
const cardId = "BT26-091";

function hasDataSquadTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes("DATA SQUAD");
}

function isEligibleDigivolveTarget(def: CardDefinition): boolean {
  const types = def.types ?? [];
  return isDigimon(def) && (types.includes("Vegetation") || types.includes("Fairy") || types.includes("DATA SQUAD"));
}

/**
 * Shared mandatory cost for the [Your Turn] clause: suspend this Tamer. Returns whether
 * the cost was paid (false when already suspended — the ability then does nothing,
 * including the digivolve benefit).
 */
async function suspendSelf(ctx: EffectContext): Promise<boolean> {
  const self = ctx.source.permanent();
  if (self === undefined || self.isSuspended) return false;
  const suspended = await ctx.fx.suspend([self.permanentId]);
  return suspended.includes(self.permanentId);
}

/**
 * Optional benefit: 1 of the owner's Digimon may digivolve into a [Vegetation], [Fairy]
 * or [DATA SQUAD] trait Digimon card in the hand, with the digivolution cost reduced by 1.
 */
async function offerReducedCostDigivolve(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const targets = owner.battleArea.filter(
    (p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
  const handCards = Array.from(owner.hand).filter((c) => isEligibleDigivolveTarget(ctx.game.definitionOf(c)));
  if (targets.length === 0 || handCards.length === 0) return;

  const proceed = await ctx.ask.optional(
    ctx,
    "1 of your Digimon may digivolve into a [Vegetation], [Fairy] or [DATA SQUAD] trait " +
      "Digimon card in the hand with the cost reduced by 1?",
  );
  if (!proceed) return;

  const chosenTarget =
    targets.length === 1
      ? targets[0]!.permanentId
      : (await ctx.ask.chooseTargets(ctx, { candidates: targets.map((p) => p.permanentId), min: 1, max: 1 }))[0];
  if (chosenTarget === undefined) return;

  const chosenCard =
    handCards.length === 1
      ? handCards[0]!.instanceId
      : (await ctx.ask.selectCards(ctx, { candidates: handCards.map((c) => c.instanceId), min: 1, max: 1 }))[0];
  if (chosenCard === undefined) return;

  await ctx.fx.digivolveFromInstance(chosenTarget, chosenCard, { payCost: true, costDelta: -1 });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Main Phase] By placing 1 [DATA SQUAD] trait card from your hand face
    // down under this Tamer, <Draw 1> and gain 1 memory.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-place-data-squad-draw-memory`,
          description:
            "[Start of Your Main Phase] By placing 1 [DATA SQUAD] trait card from your hand " +
            "face down under this Tamer, <Draw 1> and gain 1 memory.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const owner = ctx.game.player(ctx.source.ownerSeat);
            return owner.hand.some((c) => hasDataSquadTrait(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;

            const owner = ctx.game.player(ctx.source.ownerSeat);
            const candidates = owner.hand
              .filter((c) => hasDataSquadTrait(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.placeUnder(selfPerm.permanentId, chosen, { faceUp: false });
            await ctx.fx.draw(source.ownerSeat, 1);
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [Your Turn] When any of your opponent's Digimon or Tamers suspend, or effects trash
    // cards from under this Tamer, by suspending this Tamer, 1 of your Digimon may
    // digivolve into a [Vegetation], [Fairy] or [DATA SQUAD] trait Digimon card in the
    // hand with the cost reduced by 1. See the module header for the two watchers and the
    // combat/effect `whenSuspended` event sources.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-suspend-to-digivolve`,
          description:
            "[Your Turn] When any of your opponent's Digimon or Tamers suspend, or effects " +
            "trash cards from under this Tamer, by suspending this Tamer, 1 of your Digimon " +
            "may digivolve into a [Vegetation], [Fairy] or [DATA SQUAD] trait Digimon card " +
            "in the hand with the cost reduced by 1.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "whenSuspended",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: opponent Digimon/Tamer suspends -> suspend self, offer reduced-cost digivolve`,
              matches: (subCtx) => {
                if (!subCtx.source.isOwnersTurn()) return false;
                const susId = subCtx.trigger.suspendedPermanentId;
                if (susId === undefined) return false;
                const perm = subCtx.game.permanentById(susId);
                if (perm === undefined || perm.topCard === undefined) return false;
                return perm.controllerSeat !== source.ownerSeat;
              },
              run: async (subCtx) => {
                const paid = await suspendSelf(subCtx);
                if (!paid) return;
                await offerReducedCostDigivolve(subCtx, source);
              },
            });

            ctx.fx.subscribeSubTrigger({
              event: "whenDigivolutionTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: cards trashed from under this Tamer -> suspend self, offer reduced-cost digivolve`,
              matches: (subCtx) => {
                if (!subCtx.source.isOwnersTurn()) return false;
                return subCtx.trigger.subjectPermanentId === self.permanentId;
              },
              run: async (subCtx) => {
                const paid = await suspendSelf(subCtx);
                if (!paid) return;
                await offerReducedCostDigivolve(subCtx, source);
              },
            });
          },
        }),
      ];
    }

    // [Security] Play this card without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-free`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
