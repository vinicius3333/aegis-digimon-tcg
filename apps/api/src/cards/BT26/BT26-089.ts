import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-089 — Kyo Sawashiro (BT26, Yellow Tamer).
 *
 * The committed KB contains Q7137-Q7142 (2026-08-18), covering face-down stack order
 * and visibility, trash normalization, the mandatory "by" gate for the After clause,
 * and security-check timing.
 *
 * Printed text:
 *   [Start of Your Main Phase] By placing 1 [BEATBREAK] trait card from your hand face
 *   down under this Tamer, ＜Draw 1＞ and gain 1 memory.
 *   [All Turns] When your security stack is removed from, by suspending this Tamer,
 *   place the top card of your deck face down under this Tamer. After, if removed from
 *   by effects, give 1 of your opponent's Digimon ＜Security A. -1＞ until their turn ends.
 *   [Security] Play this card without paying the cost.
 *
 * Clause mapping:
 *   EffectTiming.OnStartMainPhase — cost-then-benefit, modeled on BT21-083's identically
 *     shaped "[Start of Your Main Phase] By placing 1 [trait] card from your hand under
 *     this Tamer, Draw 1 and gain 1 memory." Placement uses ctx.fx.placeUnder (the
 *     existing "face down under a permanent" primitive — see EX6/BT21/ST24 usages);
 *     no new primitive was needed.
 *
 *   EffectTiming.None — [All Turns] static: installs TWO SubTrigger watchers anchored to
 *     this Tamer, because the engine models "a security stack was removed from" as two
 *     disjoint events rather than one event carrying a removal-cause flag:
 *       - `whenSecurityRemoved` fires for every attack-driven security-check removal
 *         (securityCheck.ts fires it unconditionally after the check, whether the
 *         revealed card battled or resolved its own [Security] effect).
 *       - `whenEffectRemovesFromSecurity` fires only when an effect removes security
 *         cards OUTSIDE the check flow (primitives.ts `trashFromSecurity` — the same
 *         event BT15-084's "when an effect removes cards from your security stack"
 *         watches).
 *     Both watchers run the shared cost+benefit ("by suspending this Tamer, place the
 *     top card of your deck face down under this Tamer" — modeled on ST24-13's
 *     "place the top card of your deck face down under this Tamer"); only the
 *     `whenEffectRemovesFromSecurity` watcher additionally runs the "After, if removed
 *     from by effects" clause (grant SecurityAttack-1, modeled on BT15-084's identical
 *     grant). This is the most rules-plausible split given the engine's event model, but
 *     is UNVERIFIED against any ruling — BT26 has none yet.
 *
 *   EffectTiming.SecuritySkill — [Security] Play this card without paying the cost.
 */
const cardId = "BT26-089";

function hasBeatbreakTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes("BEATBREAK");
}

/**
 * Shared cost+benefit for the [All Turns] clause: suspend this Tamer, then place the
 * top card of the owner's deck face down under it. Returns whether the cost was paid
 * (false when the Tamer was already suspended — the whole triggered ability then does
 * nothing, including the "After" clause a caller may chain on).
 */
async function suspendAndPlaceTopDeckCardUnderSelf(
  ctx: EffectContext,
  _source: CardSource,
): Promise<boolean> {
  const self = ctx.source.permanent();
  if (self === undefined || self.isSuspended) return false;
  const topCardInstance = ctx.game.player(self.controllerSeat).deck[0];

  const suspended = await ctx.fx.suspend([self.permanentId]);
  if (!suspended.includes(self.permanentId)) return false;

  if (topCardInstance !== undefined) {
    await ctx.fx.placeUnder(self.permanentId, [topCardInstance.instanceId], { faceUp: false });
  }
  return true;
}

/** "After, if removed from by effects" — give 1 opponent Digimon SecurityAttack-1. */
async function grantOpponentSecurityAttackDebuff(
  ctx: EffectContext,
  source: CardSource,
): Promise<void> {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const candidates = ctx.game
    .player(opponentSeat)
    .battleArea.filter((p) => !p.inBreeding && p.topCard !== undefined)
    .map((p) => p.permanentId);
  if (candidates.length === 0) return;

  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (chosen.length === 0) return;

  ctx.fx.grantKeyword(chosen[0]!, "SecurityAttack", EffectDuration.UntilOpponentTurnEnd, -1);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Main Phase] By placing 1 [BEATBREAK] trait card from your hand face
    // down under this Tamer, <Draw 1> and gain 1 memory.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-place-beatbreak-draw-memory`,
          description:
            "[Start of Your Main Phase] By placing 1 [BEATBREAK] trait card from your hand " +
            "face down under this Tamer, <Draw 1> and gain 1 memory.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const owner = ctx.game.player(ctx.source.ownerSeat);
            return owner.hand.some((c) => hasBeatbreakTrait(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;

            const owner = ctx.game.player(ctx.source.ownerSeat);
            const candidates = owner.hand
              .filter((c) => hasBeatbreakTrait(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            const placed = await ctx.fx.placeUnder(selfPerm.permanentId, chosen, { faceUp: false });
            if (placed.length === 0) return;
            await ctx.fx.draw(source.ownerSeat, 1);
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [All Turns] When your security stack is removed from, by suspending this Tamer,
    // place the top card of your deck face down under this Tamer. After, if removed
    // from by effects, give 1 of your opponent's Digimon <Security A. -1> until their
    // turn ends. See the module header for why this installs two watchers.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-security-removed-place-top-deck`,
          description:
            "[All Turns] When your security stack is removed from, by suspending this " +
            "Tamer, place the top card of your deck face down under this Tamer. After, " +
            "if removed from by effects, give 1 of your opponent's Digimon " +
            "<Security A. -1> until their turn ends.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            // General case: an attack-driven security check removed a card from the
            // owner's own security stack (whether it battled or ran its own [Security]
            // effect) — cost+benefit only, no SecurityAttack debuff.
            ctx.fx.subscribeSubTrigger({
              event: "whenSecurityRemoved",
              sourcePermanentId: self.permanentId,
              once: false,
              description:
                `${cardId}: own security removed (check-driven) -> suspend self, ` +
                "place top deck card under self",
              matches: (subCtx) => subCtx.trigger.removedFromSecuritySeat === source.ownerSeat,
              run: async (subCtx) => {
                await suspendAndPlaceTopDeckCardUnderSelf(subCtx, source);
              },
            });

            // Narrower case: an EFFECT removed cards from the owner's own security stack
            // (outside the check flow) — same cost+benefit, plus the "After" clause.
            ctx.fx.subscribeSubTrigger({
              event: "whenEffectRemovesFromSecurity",
              sourcePermanentId: self.permanentId,
              once: false,
              description:
                `${cardId}: own security removed by an effect -> suspend self, place top ` +
                "deck card under self, grant SecurityAttack-1",
              matches: (subCtx) => subCtx.trigger.removedFromSecuritySeat === source.ownerSeat,
              run: async (subCtx) => {
                const paid = await suspendAndPlaceTopDeckCardUnderSelf(subCtx, source);
                if (!paid) return;
                await grantOpponentSecurityAttackDebuff(subCtx, source);
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
