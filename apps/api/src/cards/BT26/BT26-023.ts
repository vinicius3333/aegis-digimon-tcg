import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, onPlay, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-023 — Mojyamon (BT26, Blue Lv.4 Digimon, Rare Animal/DM/Ver.4).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-023 as of this port
// (`node tools/kb/query.mjs card BT26-023` returned no knowledge-base entries). implemented
// from the printed card text only; the shared [On Play][When Attacking] clause mirrors
// BT26-013's "By trashing 1 card in your hand, delete 1 of your opponent's Digimon with
// 6000 DP or less" shape (cost via selectCards(min:0,max:1), then a level/DP-gated
// opponent target pick), and the inherited [When Attacking] clause mirrors EX12-026's
// "If your hand has 7 or fewer cards, <Draw 1>" idiom (also used hand-written on
// BT26-009).
//
// [Digivolve] Lv.3 w/[DM] trait: Cost 2 — a digivolution-cost requirement, not an effect
//   clause; already carried by CardDefinition.evoCosts in cards.json and handled
//   centrally by ALTERNATE_DIGIVOLUTION_OVERRIDES, so it needs no entry here.
// ＜Jamming＞ — printed keyword, parsed automatically from effectText by the engine's
//   combat/keywords.ts (PRINTED_MATCHERS); needs no explicit grant (same treatment as
//   BT26-013's ＜Blocker＞).
// ＜Training＞ (CR §16-41-1: "By suspending this Digimon during the main phase, place the
//   top card of your deck at the bottom of this Digimon's digivolution cards.") — the
//   keyword text itself is auto-parsed by PRINTED_MATCHERS too, but the ACTIVATED ABILITY
//   it grants is only synthesized by `irCardModule` (interpreter.ts's
//   `trainingActivatedEffect`) for IR-compiled cards, which this hand-written module does
//   not go through. So the ability is coded explicitly below, timed the same way as
//   BT26-012's on-field "[Main]" activated ability (EffectTiming.OnDeclaration + the
//   `activated` builder), with the cost paid via `ctx.fx.suspend` (BT26-090's "by
//   suspending this Tamer" idiom). `ctx.fx.placeUnder(..., { belowTop: true })` matches
//   interpreter.ts's own `runPlaceUnder` handling of `fromDeckTop` (used by every other
//   ＜Training＞ card, e.g. EX9-008/016), for behavioral parity with the rest of the set
//   rather than a literal re-reading of "bottom" from the CR text.
// [On Play] [When Attacking] By placing 1 card in your hand face down as this Digimon's
//   bottom digivolution card, return 1 of your opponent's level 4 or lower Digimon to the
//   bottom of the deck.
// Inherited: [When Attacking] If your hand has 7 or fewer cards, ＜Draw 1＞.

const cardId = "BT26-023";

function isSelfAttacking(ctx: EffectContext, source: CardSource): boolean {
  const self = source.permanent();
  return self !== undefined && ctx.trigger.attackerPermanentId === self.permanentId;
}

function opponentLevel4OrLowerDigimonIds(ctx: EffectContext, source: CardSource): string[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return opponent.battleArea
    .filter((p) => {
      if (p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return isDigimon(def) && (def.level ?? 0) <= 4;
    })
    .map((p) => p.permanentId);
}

/**
 * "By placing 1 card in your hand face down as this Digimon's bottom digivolution card,
 * return 1 of your opponent's level 4 or lower Digimon to the bottom of the deck." Shared
 * by the [On Play] and [When Attacking] clauses. The placement is the cost — declining it
 * (selecting 0 cards) pays nothing and grants no effect (BT26-013's trash-cost idiom).
 */
async function placeHandCardToReturnOpponent(ctx: EffectContext, source: CardSource): Promise<void> {
  const self = source.permanent();
  if (self === undefined) return;

  const targets = opponentLevel4OrLowerDigimonIds(ctx, source);
  if (targets.length === 0) return;

  const owner = ctx.game.player(source.ownerSeat);
  const handIds = Array.from(owner.hand).map((c) => c.instanceId);
  if (handIds.length === 0) return;

  const toPlace = await ctx.ask.selectCards(ctx, { candidates: handIds, min: 0, max: 1 });
  if (toPlace.length === 0) return;
  await ctx.fx.placeUnder(self.permanentId, toPlace);

  let chosenId: string;
  if (targets.length === 1) {
    chosenId = targets[0]!;
  } else {
    const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
    if (chosen.length === 0) return;
    chosenId = chosen[0]!;
  }

  const targetPermanent = ctx.game.permanentById(chosenId);
  if (targetPermanent?.topCard === undefined) return;
  await ctx.fx.returnToDeck([targetPermanent.topCard.instanceId], { toTop: false });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] By placing 1 card in your hand face down as this Digimon's bottom
    // digivolution card, return 1 of your opponent's level 4 or lower Digimon to the
    // bottom of the deck.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-place-to-return`,
          description:
            "[On Play] By placing 1 card in your hand face down as this Digimon's " +
            "bottom digivolution card, return 1 of your opponent's level 4 or lower " +
            "Digimon to the bottom of the deck.",
          optional: false,
          canActivate: (ctx) => opponentLevel4OrLowerDigimonIds(ctx, source).length > 0,
          resolve: async (ctx) => {
            await placeHandCardToReturnOpponent(ctx, source);
          },
        }),
      ];
    }

    // [When Attacking] Same clause, plus the inherited "<Draw 1>" clause below.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-place-to-return`,
          description:
            "[When Attacking] By placing 1 card in your hand face down as this Digimon's " +
            "bottom digivolution card, return 1 of your opponent's level 4 or lower " +
            "Digimon to the bottom of the deck.",
          optional: false,
          when: (ctx) => isSelfAttacking(ctx, source),
          canActivate: (ctx) => opponentLevel4OrLowerDigimonIds(ctx, source).length > 0,
          resolve: async (ctx) => {
            await placeHandCardToReturnOpponent(ctx, source);
          },
        }),
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-when-attacking-draw`,
          description: "[When Attacking] If your hand has 7 or fewer cards, ＜Draw 1＞.",
          isInherited: true,
          optional: false,
          when: (ctx) => isSelfAttacking(ctx, source),
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).hand.length <= 7,
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    }

    // [Main] (＜Training＞, CR §16-41-1) By suspending this Digimon during the main
    // phase, place the top card of your deck at the bottom of this Digimon's
    // digivolution cards.
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/training`,
          description:
            "[Main] ＜Training＞ By suspending this Digimon, place the top card of your " +
            "deck at the bottom of this Digimon's digivolution cards.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined || self.isSuspended) return false;
            return ctx.game.player(source.ownerSeat).deck.length > 0;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined || self.isSuspended) return;

            const top = ctx.game.player(source.ownerSeat).deck[0];
            if (top === undefined) return;

            await ctx.fx.suspend([self.permanentId]);
            await ctx.fx.placeUnder(self.permanentId, [top.instanceId], { belowTop: true });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
