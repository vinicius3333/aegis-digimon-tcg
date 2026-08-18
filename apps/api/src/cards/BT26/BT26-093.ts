import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-093 — Reina Sakuya (BT26, Black Tamer).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-093` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [Start of Your Main Phase] By placing 1 [BEATBREAK] trait card from your hand face
 *   down under this Tamer, ＜Draw 1＞ and gain 1 memory.
 *   [All Turns] When a Digimon attacks, by suspending this Tamer, place the top card of
 *   your deck face down under this Tamer. After, 1 of your [BEATBREAK] trait Digimon
 *   gains ＜Collision＞ and ＜Blocker＞ for the turn.
 *   [Security] Play this card without paying the cost.
 *
 * Clause mapping:
 *   EffectTiming.OnStartMainPhase — cost-then-benefit, identical in shape to BT26-089's
 *     and BT26-091's "[Start of Your Main Phase] By placing 1 [trait] card from your
 *     hand under this Tamer, Draw 1 and gain 1 memory." Placement uses ctx.fx.placeUnder
 *     (the existing "face down under a permanent" primitive). No new primitive needed.
 *
 *   EffectTiming.None — [All Turns] static: installs a single SubTrigger watcher
 *     anchored to this Tamer on `whenAttacking`. Unlike BT26-089/BT26-091's "your
 *     security"/"your opponent's Digimon" clauses, "When a Digimon attacks" here is
 *     unqualified by seat — the trigger fires for ANY attack declaration, on either
 *     side. `whenAttacking` is fired unconditionally once per attack declaration
 *     (combat/controller.ts resolveAttack), with the attacker as the event subject and
 *     no seat restriction baked into the event itself, so an unfiltered `matches` (just
 *     "this Tamer is on the battle area") is the correct mapping — no `whenAttacks`
 *     (declared in SubTriggerEventName but never fired by the engine; dead) or
 *     `whenOpponentAttacks` (seat-restricted to the non-attacker's perspective) needed.
 *     Cost+benefit: "by suspending this Tamer" is the mandatory cost (paid whenever this
 *     Tamer is unsuspended and able — mirrors BT26-089's suspendAndPlaceTopDeckCardUnderSelf
 *     shape), "place the top card of your deck face down under this Tamer" is the
 *     unconditional first benefit (via ctx.fx.placeUnder, same primitive as the other
 *     Tamers' "place the top card ... face down under this Tamer" clauses — ST24-13),
 *     and "After, 1 of your [BEATBREAK] trait Digimon gains <Collision> and <Blocker>
 *     for the turn" is the mandatory second benefit — modeled on BT20-078's
 *     grantKeyword(id, "Collision"/"Blocker", EffectDuration.UntilEachTurnEnd) pair
 *     ("for the turn" = current-turn-end regardless of whose turn it is).
 *
 *   EffectTiming.SecuritySkill — [Security] Play this card without paying the cost.
 */
const cardId = "BT26-093";

function hasBeatbreakTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes("BEATBREAK");
}

function isOwnBeatbreakDigimon(ctx: EffectContext, source: CardSource): { permanentId: string }[] {
  return ctx.game
    .player(source.ownerSeat)
    .battleArea.filter((p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && hasBeatbreakTrait(ctx.game.definitionOf(p.topCard)))
    .map((p) => ({ permanentId: p.permanentId }));
}

/** "After, 1 of your [BEATBREAK] trait Digimon gains <Collision> and <Blocker> for the turn." */
async function grantCollisionAndBlockerToOwnBeatbreakDigimon(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = isOwnBeatbreakDigimon(ctx, source).map((p) => p.permanentId);
  if (candidates.length === 0) return;

  const chosen =
    candidates.length === 1 ? candidates[0]! : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
  if (chosen === undefined) return;

  ctx.fx.grantKeyword(chosen, "Collision", EffectDuration.UntilEachTurnEnd);
  ctx.fx.grantKeyword(chosen, "Blocker", EffectDuration.UntilEachTurnEnd);
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
          optional: true,
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
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.placeUnder(selfPerm.permanentId, chosen);
            await ctx.fx.draw(source.ownerSeat, 1);
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [All Turns] When a Digimon attacks, by suspending this Tamer, place the top card
    // of your deck face down under this Tamer. After, 1 of your [BEATBREAK] trait
    // Digimon gains <Collision> and <Blocker> for the turn. See the module header for
    // why this watches the unfiltered `whenAttacking` event.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-attack-suspend-place-top-deck-grant-keywords`,
          description:
            "[All Turns] When a Digimon attacks, by suspending this Tamer, place the top " +
            "card of your deck face down under this Tamer. After, 1 of your [BEATBREAK] " +
            "trait Digimon gains <Collision> and <Blocker> for the turn.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "whenAttacking",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: a Digimon attacks -> suspend self, place top deck card under self, grant Collision+Blocker`,
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;

                await subCtx.fx.suspend([selfPerm.permanentId]);

                const owner = subCtx.game.player(source.ownerSeat);
                const topCardInstance = owner.deck[0];
                if (topCardInstance !== undefined) {
                  topCardInstance.faceUp = false;
                  await subCtx.fx.placeUnder(selfPerm.permanentId, [topCardInstance.instanceId]);
                }

                await grantCollisionAndBlockerToOwnBeatbreakDigimon(subCtx, source);
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
