import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT15-083 — Matt Ishida (BT15, Blue Tamer).
 *
 *
 *   EffectTiming.OnPlay: Reveal top 3 of deck. Add 1 card with [Gabumon]/[Garurumon]
 *     in name to hand. Return rest to deck bottom.
 *   EffectTiming.None (YourTurn continuous SubTrigger): whenEffectAddsToHand — when a
 *     Digimon's effect adds cards to the controller's hand, by suspending this Tamer,
 *     gain 1 memory.
 *     KB Q2582: fires even if the net hand count is unchanged (e.g. draw 1 + trash 1).
 *   EffectTiming.SecuritySkill: play this Tamer without paying the cost.
 */
const cardId = "BT15-083";

function hasGabumonOrGarurumon(nameEn: string): boolean {
  return nameEn.includes("Gabumon") || nameEn.includes("Garurumon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Gabumon]/[Garurumon]
    // in its name among them to the hand. Return the rest to the bottom of the deck.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal-gabumon`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. Add 1 card with " +
            "[Gabumon]/[Garurumon] in its name among them to the hand. Return the " +
            "rest to the bottom of the deck.",
          optional: false,
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() &&
            ctx.game.player(source.ownerSeat).deck.length >= 1,
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;
            const revealed = await ctx.fx.reveal(ownerSeat, 3);
            if (revealed.length === 0) return;

            const matches = revealed.filter((c) =>
              hasGabumonOrGarurumon(ctx.game.definitionOf(c).nameEn),
            );

            let kept: string[] = [];
            if (matches.length > 0) {
              const picked = await ctx.ask.selectCards(ctx, {
                candidates: matches.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              kept = picked;
              if (picked.length > 0) {
                await ctx.fx.returnToHand(picked);
              }
            }

            // Return the rest to the bottom of the deck.
            const keptSet = new Set(kept);
            const rest = revealed
              .filter((c) => !keptSet.has(c.instanceId))
              .map((c) => c.instanceId);
            if (rest.length > 0) {
              await ctx.fx.returnToDeck(rest, { toTop: false });
            }
          },
        }),
      ];
    }

    // [Your Turn] continuous SubTrigger: whenEffectAddsToHand.
    // Fires when a Digimon's effect adds cards to the controller's hand.
    // Cost: suspend this Tamer.
    // Effect: gain 1 memory.
    // KB Q2582: fires regardless of net hand count change.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-digimon-effect-adds-to-hand`,
          description:
            "[Your Turn] When one of your Digimon's effects adds cards to your hand, " +
            "by suspending this Tamer, gain 1 memory.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeSubTrigger({
              event: "whenEffectAddsToHand",
              sourcePermanentId: self.permanentId,
              once: false,
              expiresOnTurnEndOf: ownerSeat,
              description: `${cardId} Digimon effect adds to hand — suspend to gain 1 memory`,
              matches: (subCtx) => {
                const added = subCtx.trigger.addedToHand;
                if (added === undefined) return false;
                // Must be a Digimon effect belonging to the controller.
                const byEffect = added.byEffect;
                if (byEffect === undefined) return false;
                return byEffect.isDigimonEffect && byEffect.ownerSeat === ownerSeat;
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                await subCtx.fx.suspend([selfPerm.permanentId]);
                subCtx.fx.gainMemory(1);
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
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([ctx.source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
