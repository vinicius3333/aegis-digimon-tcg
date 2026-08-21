import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX6-068";

function hasAngelArchangel(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Angel" || t === "Archangel" || t === "Three Great Angels");
}

function isThreeGreatAngelsDigimon(def: CardDefinition): boolean {
  return isDigimon(def) && (def.types ?? []).some((t) => t === "Three Great Angels" || t === "ThreeGreatAngels");
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
            "[Main] You may place 1 Digimon card with the [Angel]/[Archangel]/[Three Great Angels] " +
            "trait from your hand at the bottom of your security stack. Then, place this card in " +
            "your battle area.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const qualifying = Array.from(owner.hand).filter((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && hasAngelArchangel(def);
            });
            if (qualifying.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: qualifying.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.addSecurity(source.ownerSeat, chosen, { toTop: false });
              }
            }
            if (ctx.fx.placeOptionAsPermanent) {
              await ctx.fx.placeOptionAsPermanent(source.instanceId);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card as a battle-area permanent.",
          resolve: async (ctx) => {
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
          effectKey: `${cardId}/delay-trigger`,
          description:
            "[All Turns] When one of your Digimon with the [Angel] or [Archangel] trait is " +
            "deleted, ＜Delay＞. • Search your security stack. You may play 1 Digimon card " +
            "with the [Three Great Angels] trait among it without paying the cost. Shuffle " +
            "your security stack.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;
            ctx.fx.subscribeSubTrigger({
              event: "onDeletionOf",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              description: `${cardId}: When Angel/Archangel Digimon deleted, delay trigger.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                if (!isDigimon(def)) return false;
                return (def.types ?? []).some((t) => t === "Angel" || t === "Archangel");
              },
              run: async (subCtx) => {
                const currentSelf = subCtx.game.permanentById(self.permanentId);
                if (currentSelf === undefined) return;
                await subCtx.fx.deletePermanent([self.permanentId]);
                const owner = subCtx.game.player(ownerSeat);
                const security = [...owner.security];
                if (security.length === 0) return;
                const qualifying = security.filter((c) => isThreeGreatAngelsDigimon(subCtx.game.definitionOf(c)));
                if (qualifying.length === 0) return;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: qualifying.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await subCtx.fx.playInstances(chosen, { payCost: false });
                }
                if (owner.security.length > 0) {
                  subCtx.fx.shuffleSecurity(ownerSeat);
                }
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
