import { CardKind, EffectDuration, EffectTiming, type CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, turnTiming } from "../../engine/effects/builders.js";
import { compiledEffects } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "EX4-021";

/**
 * EX4-021 — EX4 Blue Digimon.
 *
 * 1. [On Play]: De-Digivolve 1 opponent Digimon, then all opponent Lv.4- Digimon
 * 2. [All Turns] WouldLeavePlay (delete/return-hand/return-deck): play 1 MetalGreymon
 *    AND 1 DarkKnightmon from digivolution cards without cost.
 * 3. [DigiXros -2] "Blue MetalGreymon" + "DarkKnightmon". The recipe is
 *    structural play-legality data, not an effect-module clause: it lives in @aegis/shared
 *    `digiXrosRequirementFor` (a DIGIXROS_REQUIREMENT_OVERRIDES entry that splits the slot-1 label
 *    into name "MetalGreymon" + color Blue) and is consumed by the engine's DigiXros play subsystem
 *    (`engine/actions/digiXros.ts`). A3: `EX4-021.test.ts`.
 */

function eligibleMetalGreymonInStack(ctx: EffectContext): string[] {
  const selfPerm = ctx.source.permanent();
  if (selfPerm === undefined) return [];
  return selfPerm.stack
    .filter((c) => {
      const name = ctx.game.definitionOf(c).nameEn;
      return name.includes("MetalGreymon");
    })
    .map((c) => c.instanceId);
}

function eligibleDarkKnightmonInStack(ctx: EffectContext): string[] {
  const selfPerm = ctx.source.permanent();
  if (selfPerm === undefined) return [];
  return selfPerm.stack
    .filter((c) => {
      const name = ctx.game.definitionOf(c).nameEn;
      return name.includes("DarkKnightmon");
    })
    .map((c) => c.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play]: De-Digivolve 1 opp Digimon + restrict opp Lv.4-
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-de-digivolve-restrict-attack`,
          description:
            "[On Play] <De-Digivolve 1> 1 of your opponent's Digimon. Then, " +
            "all of your opponent's level 4 or lower Digimon can't attack until the end of your opponent's turn.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            // De-Digivolve 1 opponent Digimon
            const oppSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
            const opp = ctx.game.player(oppSeat);
            const oppDigimonIds = opp.battleArea
              .filter((p) => {
                if (p.inBreeding || p.topCard === undefined) return false;
                return ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon);
              })
              .map((p) => p.permanentId);

            if (oppDigimonIds.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: oppDigimonIds,
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                ctx.fx.deDigivolve(chosen[0]!, 1, { byEffectSeat: ctx.source.ownerSeat });
              }
            }

            // Restrict opponent's level 4 or lower Digimon from attacking players
            for (const p of opp.battleArea) {
              if (p.inBreeding || p.topCard === undefined) continue;
              const def = ctx.game.definitionOf(p.topCard);
              if (!def.kinds.includes(CardKind.Digimon)) continue;
              if (def.level === undefined || def.level > 4) continue;
              ctx.fx.restrict(p.permanentId, "attackPlayers", EffectDuration.UntilOpponentTurnEnd);
            }
          },
        }),
      ];
    }

    // [All Turns] WouldLeavePlay: play MetalGreymon + DarkKnightmon from digivolution cards
    if (timing === EffectTiming.WhenPermanentWouldBeDeleted) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/would-leave-play-play-from-stack`,
          description:
            "[All Turns] When this Digimon would be deleted or returned to your hand or deck, " +
            "you may play 1 [MetalGreymon] and 1 [DarkKnightmon] from this Digimon's digivolution " +
            "cards without paying the costs.",
          optional: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return false;
            // Ensure this permanent is the one being removed
            if (ctx.trigger.deletedPermanentId !== selfPerm.permanentId) return false;
            return true;
          },
          canActivate: (ctx) => {
            return (
              eligibleMetalGreymonInStack(ctx).length >= 1 ||
              eligibleDarkKnightmonInStack(ctx).length >= 1
            );
          },
          resolve: async (ctx) => {
            const mgIds = eligibleMetalGreymonInStack(ctx);
            const dkIds = eligibleDarkKnightmonInStack(ctx);

            const toPlay: string[] = [];

            // Select 1 MetalGreymon
            if (mgIds.length > 0) {
              const chosenMg = await ctx.ask.selectCards(ctx, {
                candidates: mgIds,
                min: 1,
                max: 1,
              });
              if (chosenMg.length > 0) toPlay.push(...chosenMg);
            }

            // Select 1 DarkKnightmon
            if (dkIds.length > 0) {
              const chosenDk = await ctx.ask.selectCards(ctx, {
                candidates: dkIds,
                min: 1,
                max: 1,
              });
              if (chosenDk.length > 0) toPlay.push(...chosenDk);
            }

            if (toPlay.length > 0) {
              await ctx.fx.playInstances(toPlay, { payCost: false });
            }
          },
        }),
      ];
    }

    // Also need WouldLeavePlay for return-to-hand and return-to-deck
    // In our engine: OnLeaveFieldAnyone covers both
    if (timing === EffectTiming.OnLeaveFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/would-leave-play-play-from-stack-bounce`,
          description:
            "[All Turns] When this Digimon would be returned to hand/deck, " +
            "you may play MetalGreymon + DarkKnightmon from digivolution cards without cost.",
          optional: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return false;
            return true;
          },
          canActivate: (ctx) => {
            return (
              eligibleMetalGreymonInStack(ctx).length >= 1 ||
              eligibleDarkKnightmonInStack(ctx).length >= 1
            );
          },
          resolve: async (ctx) => {
            const mgIds = eligibleMetalGreymonInStack(ctx);
            const dkIds = eligibleDarkKnightmonInStack(ctx);
            const toPlay: string[] = [];

            if (mgIds.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, { candidates: mgIds, min: 1, max: 1 });
              if (chosen.length > 0) toPlay.push(...chosen);
            }
            if (dkIds.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, { candidates: dkIds, min: 1, max: 1 });
              if (chosen.length > 0) toPlay.push(...chosen);
            }

            if (toPlay.length > 0) {
              await ctx.fx.playInstances(toPlay, { payCost: false });
            }
          },
        }),
      ];
    }

    return [];
  },
};

const compiled = JSON.parse(JSON.stringify(compiledEffects[cardId]!)) as CompiledCard;
const replacement = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];
if (replacement?.kind === "Replacement") {
  replacement.event = "wouldLeavePlay";
  replacement.raw = "When this Digimon would leave the battle area, play MetalGreymon and DarkKnightmon from its digivolution cards without paying their costs.";
  replacement.actions = [
    { kind: "PlayWithoutCost", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["MetalGreymon"], match: "name" }] }, count: 1 }, from: ["digivolutionCards"], payCost: false, optional: true },
    { kind: "PlayWithoutCost", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DarkKnightmon"], match: "name" }] }, count: 1 }, from: ["digivolutionCards"], payCost: false, optional: true },
  ];
}
compiled.coverage = "full";
compiled.residual = [];
registerIrCard(cardId, compiled);
export default module;
