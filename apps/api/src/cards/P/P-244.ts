import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-244";

function hasVemmonOrZenith(def: CardDefinition): boolean {
  return def.nameEn.includes("Vemmon") || def.nameEn.includes("Zenith");
}

function hasVemmonText(def: CardDefinition): boolean {
  return JSON.stringify(def).includes("Vemmon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] You may play 1 [Vemmon] or [Zenith] from your hand or trash without paying " +
            "the cost. Then, place this card in the battle area.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(owner.hand)
              .concat(Array.from(owner.trash))
              .filter((c) => hasVemmonOrZenith(ctx.game.definitionOf(c)));
            if (candidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
              }
            }
            if (ctx.fx.placeOptionAsPermanent) {
              await ctx.fx.placeOptionAsPermanent(source.instanceId);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/delay-digivolve`,
          description:
            "＜Delay＞ [All Turns] When effects place [Vemmon] as any of your Digimon's " +
            "digivolution cards, you may digivolve 1 of your Digimon with [Vemmon] in its " +
            "text into a [Vemmon] text card from your hand or trash with cost reduced by 3.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "onAddDigivolutionCards",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Vemmon placed as digivolution, digivolve.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const host = subCtx.game.permanentById(subjectId);
                if (host === undefined || host.topCard === undefined) return false;
                const addedIds = subCtx.trigger?.addedDigivolutionCardInstanceIds ?? [];
                const addedVemmon = addedIds.some((instanceId) => {
                  const card = host.stack.find((entry) => entry.instanceId === instanceId);
                  return card !== undefined && hasVemmonText(subCtx.game.definitionOf(card));
                });
                return addedVemmon && hasVemmonText(subCtx.game.definitionOf(host.topCard));
              },
              run: async (subCtx) => {
                const currentSelf = subCtx.game.permanentById(self.permanentId);
                if (currentSelf === undefined) return;
                const owner = subCtx.game.player(source.ownerSeat);
                const targets = Array.from(owner.battleArea)
                  .filter((p) => p.topCard !== undefined && hasVemmonText(subCtx.game.definitionOf(p.topCard)))
                  .map((p) => p.permanentId);
                if (targets.length === 0) return;
                const chosen = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: targets,
                  min: 0,
                  max: 1,
                });
                if (chosen.length === 0) return;
                const intoCards = Array.from(owner.hand)
                  .concat(Array.from(owner.trash))
                  .filter((c) => {
                    const def = subCtx.game.definitionOf(c);
                    return isDigimon(def) && def.nameEn.includes("Vemmon");
                  });
                if (intoCards.length === 0) return;
                const into = await subCtx.ask.selectCards(subCtx, {
                  candidates: intoCards.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                if (into.length > 0) {
                  await subCtx.fx.digivolveFromInstance(chosen[0]!, into[0]!, {
                    payCost: true,
                    ignoreRequirements: true,
                  });
                }
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's [Main] effect.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(owner.hand)
              .concat(Array.from(owner.trash))
              .filter((c) => hasVemmonOrZenith(ctx.game.definitionOf(c)));
            if (candidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
              }
            }
            if (ctx.fx.placeOptionAsPermanent) {
              await ctx.fx.placeOptionAsPermanent(source.instanceId);
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
