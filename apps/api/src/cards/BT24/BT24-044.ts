// @ts-nocheck
import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

/**
 * BT24-044 — Muchomon (BT24, Green Digimon).
 *
 * Printed text (no errata):
 *   [On Play] You may suspend 1 level 6 or lower Digimon. If this effect suspended your
 *   Digimon, reveal the top 3 cards of your deck. Add 1 [Shoto Kazama] and 1 card with
 *   [Avian] or [Bird] in any of its traits or the [Vortex Warriors] trait among them to
 *   the hand. Return the rest to the bottom of the deck.
 *   [Inherited][All Turns][Once Per Turn] When this Digimon deletes your opponent's
 *   Digimon in battle, gain 1 memory.
 *
 * Q&A Q5632: the suspend target can be either player's Digimon.
 */
const cardId = "BT24-044";

function isShotoKazama(def: { nameEn: string }): boolean {
  return matchNameOrTrait(def, { tokens: ["Shoto Kazama"], match: "nameExact" });
}

function isAvianBirdOrVortexWarriors(def: { types?: string[]; forms?: string[]; attributes?: string[] }): boolean {
  return matchNameOrTrait(def, {
    tokens: ["Avian", "Bird", "Vortex Warriors"],
    match: "trait",
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] You may suspend 1 level 6 or lower Digimon. If this effect suspended " +
            "your Digimon, reveal the top 3 cards of your deck. Add 1 [Shoto Kazama] and 1 " +
            "card with [Avian] or [Bird] in any of its traits or the [Vortex Warriors] trait " +
            "among them to the hand. Return the rest to the bottom of the deck.",
          optional: true,
          canActivate: (ctx: any) => true,
          resolve: async (ctx: any) => {
            const allDigi = [
              ...ctx.game.player(source.ownerSeat).battleArea,
              ...ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea,
            ]
              .filter((p: any) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return isDigimon(def) && (def as any).level <= 6 && !p.isSuspended;
              })
              .map((p: any) => p.permanentId);
            if (!allDigi.length) return;

            const s = await ctx.ask.selectPermanents(ctx, { candidates: allDigi, min: 0, max: 1 });
            if (!s.length) return;
            await ctx.fx.suspend(s);

            const owner = ctx.game.player(source.ownerSeat);
            const suspendedOwnDigimon = owner.battleArea.some((p: any) => p.permanentId === s[0]);
            if (!suspendedOwnDigimon) return;

            const revealed = await ctx.fx.reveal(source.ownerSeat, 3);

            const shotoCandidates = revealed.filter((c: any) => isShotoKazama(ctx.game.definitionOf(c)));
            let selected: string[] = [];

            if (shotoCandidates.length > 0) {
              const pick = await ctx.ask.selectCards(ctx, {
                candidates: shotoCandidates.map((c: any) => c.instanceId),
                min: 1,
                max: 1,
              });
              selected = selected.concat(pick);
            }

            const avianCandidates = revealed.filter(
              (c: any) => !selected.includes(c.instanceId) && isAvianBirdOrVortexWarriors(ctx.game.definitionOf(c)),
            );

            if (avianCandidates.length > 0) {
              const pick = await ctx.ask.selectCards(ctx, {
                candidates: avianCandidates.map((c: any) => c.instanceId),
                min: 1,
                max: 1,
              });
              selected = selected.concat(pick);
            }

            const selectedSet = new Set(selected);
            if (selectedSet.size > 0) {
              await ctx.fx.returnToHand(Array.from(selectedSet));
            }

            const rest = revealed.filter((c: any) => !selectedSet.has(c.instanceId)).map((c: any) => c.instanceId);
            if (rest.length > 0) {
              await ctx.fx.returnToDeck(rest, { toTop: false });
            }
          },
        }),
      ];
    }
    if (timing === EffectTiming.OnBattleDeleteOpponent) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/battle-delete`,
          description: "[All Turns][Once Per Turn] When deletes opponent Digimon in battle, +1 memory.",
          optional: false,
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => ctx.fx.gainMemoryForSeat(source.ownerSeat, 1),
        }),
      ];
    }
    return [];
  },
};
registerCard(module);
export default module;
