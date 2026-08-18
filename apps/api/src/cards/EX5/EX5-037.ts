import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX5-037 — Vajramon (EX5, Green Lv.6 Digimon).
 *
 *
 *   OnEnterFieldAnyone (lines 12-123): [On Play] Draw 1. Then, you may play 1 [Deva] trait
 *     Digimon from your hand to an empty breeding slot without paying the cost, provided it
 *     has a different name from all cards in your battle area and trash.
 *     KB Q3601: "same name as cards in your battle area" includes battle-area top cards
 *       (not digivolution cards or cards under Tamers, Q3602).
 *     KB Q3603: [On Play] effects do not activate for Digimon played into the breeding area.
 *
 *   OnUseOption (lines 126-169): [Your Turn] [Once Per Turn] when you use an Option card with
 *     a use cost of 1 or more, gain 1 memory.
 *     KB Q5507: does NOT trigger if an Option effect activates without being used.
 *     KB Q5508: if the card's own cost was reduced to 0, doesn't trigger.
 *     KB Q5509/Q5510: if cost-to-pay is reduced to 0 but original cost >= 1, triggers.
 *     Modeled via a staticModifier installing a whenOptionUsed sub-trigger (once per turn).
 *
 *   OnDetermineDoSecurityCheck (lines 171-205): [Your Turn] [Inherited] if this Digimon has
 *     the [Four Sovereigns] or [God Beast] trait, it gains ＜Piercing＞.
 *     Modeled as a staticModifier that grants Piercing while the trait condition holds.
 */
const cardId = "EX5-037";

function hasFourSovereignsOrGodBeast(def: CardDefinition): boolean {
  const types = def.types ?? [];
  return (
    types.includes("Four Sovereigns") ||
    types.includes("FourSovereigns") ||
    types.includes("God Beast") ||
    types.includes("GodBeast")
  );
}

function isDevaTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes("Deva");
}

function battleAreaAndTrashNames(ctx: EffectContext, source: CardSource): Set<string> {
  const names = new Set<string>();
  const player = ctx.game.player(source.ownerSeat);
  for (const perm of player.battleArea) {
    if (perm.topCard !== undefined) {
      names.add(ctx.game.definitionOf(perm.topCard).nameEn);
    }
  }
  for (const card of player.trash) {
    names.add(ctx.game.definitionOf(card).nameEn);
  }
  return names;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Draw 1. Then, you may play 1 [Deva] Digimon from hand to empty breeding slot.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-draw-breed-deva`,
          description:
            "[On Play] Draw 1. Then, you may play 1 [Deva] trait Digimon from your hand " +
            "without the same name as the cards in your battle area or trash to an empty " +
            "breeding slot without paying the cost.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 1);

            const player = ctx.game.player(source.ownerSeat);
            if (player.breeding !== undefined) {
              return;
            }

            const takenNames = battleAreaAndTrashNames(ctx, source);
            const candidates = Array.from(player.hand)
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return isDigimon(def) && isDevaTrait(def) && !takenNames.has(def.nameEn);
              })
              .map((c) => c.instanceId);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (chosen.length === 0) return;

            await ctx.fx.playInstances(chosen, { payCost: false, breeding: true });
          },
        }),
      ];
    }

    // Static effects: [Your Turn][Once Per Turn] whenOptionUsed gain 1 memory, and
    // [Inherited][Your Turn] Piercing when has [Four Sovereigns]/[God Beast] trait.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-option-gain-memory`,
          description:
            "[Your Turn] [Once Per Turn] When you use an Option card with a use cost of " +
            "1 or more, gain 1 memory.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            ctx.fx.subscribeSubTrigger({
              event: "whenOptionUsed",
              sourcePermanentId: ctx.source.permanent()?.permanentId,
              once: true,
              oncePerTiming: false,
              expiresOnTurnEndOf: source.ownerSeat,
              oncePerTurnKey: `${cardId}/your-turn-option-gain-memory`,
              description: `${cardId}: gain 1 memory when owner uses Option with original cost >= 1`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                // KB Q5508: gate on ORIGINAL use cost, not the reduced cost-to-pay.
                const cost = subCtx.trigger.usedOptionCost ?? 0;
                return cost >= 1;
              },
              run: async (subCtx) => {
                subCtx.fx.gainMemory(1);
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-piercing-sovereigns-god-beast`,
          description:
            "[Your Turn] [Inherited] While this Digimon has the [Four Sovereigns] or " +
            "[God Beast] trait, it gains ＜Piercing＞.",
          isInherited: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea() || !ctx.source.isOwnersTurn()) return false;
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.topCard === undefined) return false;
            return hasFourSovereignsOrGodBeast(ctx.game.definitionOf(perm.topCard));
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined) return;
            ctx.fx.grantPierce(perm.permanentId, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
