import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { canDigivolveOnto } from "../../engine/cards/cardData.js";

/**
 * ST17-13 — Magnamon (ST17, Yellow/White Lv.6 Digimon).
 *
 *
 * <Blocker> <Armor Purge>
 * [Digivolve] [Veemon]: Cost 3
 * [When Digivolving] Trash the top digivolution card of 1 of your opponent's Digimon
 *   for each of that Digimon's colors. Then, return 1 of your opponent's Digimon with
 *   no digivolution cards to the hand.
 * [Security] <De-Digivolve 1> 1 Digimon. At the end of the battle, 1 of your Digimon
 *   may digivolve into this card without paying the digivolution cost.
 *
 *   EffectTiming.None → Blocker static + AddSelfDigivolutionRequirement (Veemon, cost 3).
 *   EffectTiming.WhenPermanentWouldBeDeleted → ArmorPurge.
 *   EffectTiming.OnEnterFieldAnyone (WhenDigivolving) → color-scaled trash + bounce.
 *   EffectTiming.SecuritySkill → De-Digivolve 1; end-of-battle digivolve gap.
 *
 * Residuals:
 *   - DigivolveIntoSecurityAtBattleEnd: "At the end of the battle, digivolve into this
 *     security-zone card" requires a timing/zone combination (digivolving from
 *     security at battle end) that does not exist in the engine's timing vocabulary.
 *   - Blocker and Armor Purge are keyword abilities handled via the IR keyword layer;
 *     they are not hand-wired here — the digivolutionRequirement override below
 *     coexists with those.
 *
 * Note: the alternate digivolution requirement (Veemon, cost 3) is preserved in
 * effects.json / ALTERNATE_DIGIVOLUTION_OVERRIDES, which the engine reads for
 * digivolve legality. The hand-written module does not need to re-declare it.
 */

const cardId = "ST17-13";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // [When Digivolving] (documented behavior)
    // Step 1: Choose 1 opponent Digimon; trash its top N digi-cards where N = that
    //   Digimon's color count (selectedPermanent.TopCard.CardColors.Count()).
    // Step 2: Choose 1 opponent Digimon with no digi-cards; return it to hand.
    if (timing === EffectTiming.WhenDigivolving) {
      out.push(
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-trash-bounce`,
          description:
            "[When Digivolving] Trash the top digivolution card(s) of 1 of your opponent's " +
            "Digimon for each of that Digimon's colors. Then, return 1 of your opponent's " +
            "Digimon with no digivolution cards to the hand.",
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            const opponent = ctx.game.player(opponentSeat);

            // Step 1: pick an opponent Digimon with at least 1 digi-card
            const trashCandidates = opponent.battleArea
              .filter((p) => p.stack.length > 0)
              .map((p) => p.topCard.instanceId);

            if (trashCandidates.length > 0) {
              const picks = await ctx.ask.chooseTargets(ctx, {
                candidates: trashCandidates,
                min: 1,
                max: 1,
              });
              if (picks.length > 0) {
                const targetPerm = opponent.battleArea.find((p) => p.topCard.instanceId === picks[0]);
                if (targetPerm !== undefined) {
                  const def = ctx.game.definitionOf(targetPerm.topCard);
                  const colorCount = def.colors.length;

                  if (colorCount > 0 && targetPerm.stack.length > 0) {
                    // Trash the top `colorCount` digi-cards from the target.
                    const stackIds = targetPerm.stack.map((c) => c.instanceId);
                    const toTrash = stackIds.slice(stackIds.length - colorCount);
                    await ctx.fx.trashDigivolutionCards(targetPerm.permanentId, toTrash, {
                      byEffectSeat: source.ownerSeat,
                    });
                  }
                }
              }
            }

            // Step 2: pick an opponent Digimon with NO digi-cards and bounce it.
            const bounceCandidates = opponent.battleArea
              .filter((p) => p.stack.length === 0)
              .map((p) => p.topCard.instanceId);

            if (bounceCandidates.length > 0) {
              const picks2 = await ctx.ask.chooseTargets(ctx, {
                candidates: bounceCandidates,
                min: 1,
                max: 1,
              });
              if (picks2.length > 0) {
                await ctx.fx.returnToHand(picks2);
              }
            }
          },
        }),
      );
    }

    // [Security] <De-Digivolve 1> 1 Digimon. (documented behavior)
    // The "At end of battle digivolve into this card" part is a residual (engine gap).
    if (timing === EffectTiming.SecuritySkill) {
      out.push(
        security({
          source,
          effectKey: `${cardId}/security-de-digivolve`,
          description:
            "[Security] <De-Digivolve 1> 1 Digimon. " +
            "(RESIDUAL: At the end of the battle, 1 of your Digimon may digivolve into this " +
            "card without paying the digivolution cost — engine gap: digivolve from security " +
            "at battle end not yet supported.)",
          resolve: async (ctx) => {
            // De-Digivolve 1: choose any battle-area Digimon
            const allDigimonIds: string[] = [];
            for (const p of ctx.game.player(0).battleArea) allDigimonIds.push(p.topCard.instanceId);
            for (const p of ctx.game.player(1).battleArea) allDigimonIds.push(p.topCard.instanceId);

            if (allDigimonIds.length > 0) {
              const picks = await ctx.ask.chooseTargets(ctx, {
                candidates: allDigimonIds,
                min: 1,
                max: 1,
              });
              if (picks.length > 0) {
                const targetPerm =
                  ctx.game.player(0).battleArea.find((p) => p.topCard.instanceId === picks[0]) ??
                  ctx.game.player(1).battleArea.find((p) => p.topCard.instanceId === picks[0]);
                if (targetPerm !== undefined) {
                  ctx.fx.deDigivolve(targetPerm.permanentId, 1, {
                    byEffectSeat: source.ownerSeat,
                  });
                }
              }
            }
            ctx.fx.subscribeSubTrigger({
              event: "whenSecurityBattleEnded",
              sourceInstanceId: source.instanceId,
              once: true,
              description: `${cardId}: at end of security battle, may digivolve into this card`,
              run: async (subCtx) => {
                const selfDef = subCtx.game.definitionOf({ cardId: source.cardId } as never);
                const candidates = subCtx.game.player(source.ownerSeat).battleArea.filter((permanent) => {
                  if (permanent.inBreeding || permanent.topCard === undefined) return false;
                  const baseDef = subCtx.game.definitionOf(permanent.topCard);
                  return isDigimon(baseDef) && canDigivolveOnto(selfDef, baseDef);
                });
                if (candidates.length === 0) return;
                if (
                  !(await subCtx.ask.optional(
                    subCtx,
                    "At the end of the security battle, digivolve one of your Digimon into this card without paying the cost?",
                  ))
                )
                  return;
                const chosen = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: candidates.map((permanent) => permanent.permanentId),
                  min: 1,
                  max: 1,
                });
                const targetId = chosen[0];
                if (targetId !== undefined) {
                  await subCtx.fx.digivolveFromInstance(targetId, source.instanceId, { payCost: false });
                }
              },
            });
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
