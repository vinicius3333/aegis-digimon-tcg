import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX4-051 — BlitzGreymon (EX4, Black Lv.6 Digimon).
 *
 * Digivolution requirement: 3 from MetalGreymon (handled by engine).
 * [When Digivolving] Choose 1 of 3 effects:
 *   1) De-Digivolve 1 on 3 opponent Digimon.
 *   2) Digivolve 1 other of your Digimon into Lv.≤6 [Garurumon] from hand, no cost.
 *   3) DNA digivolve this + another Digimon into hand card, paying cost.
 * Inherited [When Attacking][Once Per Turn] If [Omnimon] in name:
 *   trash top of opponent's security.
 */
const cardId = "EX4-051";

const MODAL_OPTIONS = [
  "De-Digivolve 1 on 3 opponent Digimon",
  "Digivolve another into [Garurumon] for free",
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
            "[When Digivolving] Activate 1 of the effects below. - <De-Digivolve 1> 3 of your opponent's Digimon. - 1 of your other Digimon digivolves into a level 6 or lower Digimon card with [Garurumon] in its name in your hand without paying the cost. - This Digimon and one of your other Digimon may DNA digivolve into a Digimon card in your hand for the cost.",
          optional: false,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;

            const idx = await ctx.ask.chooseOption(ctx, MODAL_OPTIONS);
            if (idx < 0 || idx >= 3) return;

            if (idx === 0) {
              const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
              const targets = opp.battleArea
                .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
                .map((p) => p.permanentId);
              if (targets.length === 0) return;
              const maxSelect = Math.min(3, targets.length);
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: maxSelect });
              for (const id of chosen) {
                ctx.fx.deDigivolve(id, 1);
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
                    return isDigimon(def) && def.nameEn.includes("Garurumon") && (def.level ?? 99) <= 6;
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
                  return isDigimon(def) && def.nameEn.includes("Garurumon") && (def.level ?? 99) <= 6;
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

    // Inherited [When Attacking][Once Per Turn] Trash top security if Omnimon named.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inh-security-trash`,
          description:
            "Inherited: [When Attacking][Once Per Turn] If this Digimon has [Omnimon] in its name, trash the top card of your opponent's security stack.",
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
            await ctx.fx.trashFromSecurity(ctx.game.opponentOf(source.ownerSeat), 1, { fromTop: true });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
