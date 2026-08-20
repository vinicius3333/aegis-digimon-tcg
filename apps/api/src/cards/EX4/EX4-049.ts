import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX4-049 — Omnimon (EX4, Black Lv.6 Digimon).
 *
 * Digivolution requirement: 3 from WereGarurumon (handled by engine).
 * [When Digivolving] Choose 1 of 3 effects:
 *   1) Budget bounce: choose any number of opponent's Digimon (play cost ≤6 each),
 *      total play cost ≤6, at least 1 — return to deck bottom.
 *   2) Digivolve 1 other of your Digimon into Lv.≤6 [Greymon] from hand, no cost.
 *   3) DNA digivolve using this + another Digimon into hand card, paying cost.
 * Inherited [When Attacking][Once Per Turn] If [Omnimon] in name:
 *   return 1 opponent's Lv.≤5 Digimon to deck bottom.
 */
const cardId = "EX4-049";

const MODAL_OPTIONS = [
  "Deck Bounce (opponent Digimon total cost ≤6)",
  "Digivolve another into [Greymon] for free",
  "DNA Digivolution",
];

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] Activate 1 of the effects below. - Choose any number of your opponent's Digimon so that their play cost total is up to 6 and return them to the bottom of the deck. - 1 of your other Digimon digivolves into a level 6 or lower Digimon card with [Greymon] in its name in your hand without paying the cost. - This Digimon and one of your other Digimon may DNA digivolve into a Digimon card in your hand for the cost.",
          optional: false,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;

            const idx = await ctx.ask.chooseOption(ctx, MODAL_OPTIONS);
            if (idx < 0 || idx >= 3) return;

            if (idx === 0) {
              const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
              const eligible = opp.battleArea.filter((p) => {
                if (p.topCard === undefined) return false;
                if (!isDigimon(ctx.game.definitionOf(p.topCard))) return false;
                const cost = ctx.game.definitionOf(p.topCard).playCost;
                return cost !== undefined && cost <= 6;
              });
              if (eligible.length === 0) return;
              const chosen: string[] = [];
              const remaining = eligible.map((p) => ({
                id: p.permanentId,
                cost: ctx.game.definitionOf(p.topCard!).playCost ?? 0,
              }));
              const avail = remaining.filter((r) => r.cost <= 6);
              while (avail.length > 0) {
                const currentTotal = chosen.reduce((sum, id) => {
                  const perm = ctx.game.permanentById(id);
                  if (!perm || perm.topCard === undefined) return sum;
                  return sum + (ctx.game.definitionOf(perm.topCard).playCost ?? 0);
                }, 0);
                const pickable = avail.filter((r) => currentTotal + r.cost <= 6);
                if (pickable.length === 0) break;
                const pick = await ctx.ask.selectCards(ctx, {
                  candidates: pickable.map((a) => a.id),
                  min: 0,
                  max: 1,
                });
                if (pick.length === 0) break;
                chosen.push(pick[0]!);
                const pickedIndex = avail.findIndex((candidate) => candidate.id === pick[0]);
                if (pickedIndex >= 0) avail.splice(pickedIndex, 1);
              }
              if (chosen.length > 0) {
                await ctx.fx.returnToDeck(chosen, { toTop: false });
              }
            } else if (idx === 1) {
              const mine = ctx.game.player(source.ownerSeat).battleArea;
              const hand = ctx.game.player(source.ownerSeat).hand;
              const options = mine
                .filter((p) => {
                  if (p.topCard === undefined) return false;
                  if (p.permanentId === self.permanentId) return false;
                  if (!isDigimon(ctx.game.definitionOf(p.topCard))) return false;
                  return hand.some((c) => {
                    const def = ctx.game.definitionOf(c);
                    return isDigimon(def) && def.nameEn.includes("Greymon") && (def.level ?? 99) <= 6;
                  });
                })
                .map((p) => p.permanentId);
              if (options.length === 0) return;
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: options, min: 1, max: 1 });
              if (chosen.length === 0) return;
              const targetId = chosen[0]!;
              const intoCandidates = hand
                .filter((c) => {
                  const def = ctx.game.definitionOf(c);
                  return isDigimon(def) && def.nameEn.includes("Greymon") && (def.level ?? 99) <= 6;
                })
                .map((c) => c.instanceId);
              if (intoCandidates.length === 0) return;
              const intoId = await ctx.ask.selectCards(ctx, { candidates: intoCandidates, min: 1, max: 1 });
              if (intoId.length === 0) return;
              await ctx.fx.digivolveFromInstance(targetId, intoId[0]!, { payCost: false });
            } else if (idx === 2) {
              const hand = ctx.game.player(source.ownerSeat).hand;
              const digi = hand.filter((c) => isDigimon(ctx.game.definitionOf(c)));
              if (digi.length === 0) return;
              const intoId = await ctx.ask.selectCards(ctx, {
                candidates: digi.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (intoId.length === 0) return;
              const mine = ctx.game.player(source.ownerSeat).battleArea
                .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.permanentId !== self.permanentId)
                .map((p) => p.permanentId);
              if (mine.length === 0) return;
              const secondMaterial = await ctx.ask.chooseTargets(ctx, { candidates: mine, min: 1, max: 1 });
              if (secondMaterial.length === 0) return;
              await ctx.fx.dnaDigivolveInto(
                [self.permanentId, secondMaterial[0]!],
                intoId[0]!,
                { payCost: true },
              );
            }
          },
        }),
      ];
    }

    // Inherited [When Attacking][Once Per Turn] Deck bounce Lv.≤5 if Omnimon named.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inh-deck-bounce`,
          description:
            "Inherited: [When Attacking][Once Per Turn] If this Digimon has [Omnimon] in its name, return 1 of your opponent's level 5 or lower Digimon to the bottom of its owner's deck.",
          optional: false,
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => {
            const self = source.permanent();
            if (!self) return false;
            const def = ctx.game.definitionOf(self.topCard);
            return def.nameEn.includes("Omnimon");
          },
          resolve: async (ctx) => {
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const targets = opp.battleArea
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                if (!isDigimon(def)) return false;
                return (def.level ?? 99) <= 5;
              })
              .map((p) => p.permanentId);
            if (targets.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
            if (chosen.length > 0) {
              await ctx.fx.returnToDeck(chosen, { toTop: false });
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
