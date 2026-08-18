import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX9-021";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] If DNA digivolving, this Digimon is unaffected by opponent's " +
            "Digimon effects until end of turn. Then, delete all of your opponent's Digimon " +
            "with the highest level.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const singleSelf = source.permanent();
            if (singleSelf === undefined) return;

            const isDna = ctx.trigger?.isDnaDigivolve ?? false;
            if (isDna) {
              ctx.fx.restrict(singleSelf.permanentId, "beAffected",
                EffectDuration.UntilEachTurnEnd,
                { fromSourceKind: ["Digimon"] },
              );
            }

            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppDigimon = Array.from(ctx.game.player(opponent).battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)));
            if (oppDigimon.length === 0) return;

            oppDigimon.sort((a, b) => {
              const defA = ctx.game.definitionOf(a.topCard!);
              const defB = ctx.game.definitionOf(b.topCard!);
              return (defB.level ?? 0) - (defA.level ?? 0);
            });
            const highestLevel = ctx.game.definitionOf(oppDigimon[0]!.topCard!).level ?? 0;
            const toDelete = oppDigimon
              .filter((p) => (ctx.game.definitionOf(p.topCard!).level ?? 0) === highestLevel)
              .map((p) => p.permanentId);
            if (toDelete.length > 0) {
              await ctx.fx.deletePermanent(toDelete);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/end-attack-play-from-digi`,
          description:
            "[End of Attack] Once Per Turn When this Digimon attacks, play 1 [Greymon] or " +
            "[Ver.1] card and 1 [Garurumon] or [Ver.2] card from this Digimon's digivolution " +
            "cards without paying the costs. Then, place this Digimon at the top of your " +
            "security stack.",
          maxPerTurn: 1,
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenBattleWon",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              oncePerTurnKey: `${cardId}/end-attack-play-from-digi`,
              description: `${cardId}: After attack, play Greymon/Ver.1 and Garurumon/Ver.2 from digivolution cards.`,
              run: async (subCtx) => {
                const currentSelf = subCtx.game.permanentById(self.permanentId);
                if (currentSelf === undefined) return;

                const greymonCards = currentSelf.stack.filter((c) => {
                  const def = subCtx.game.definitionOf(c);
                  return def.nameEn === "Greymon" || (def.types ?? []).includes("Ver.1");
                });
                const garurumonCards = currentSelf.stack.filter((c) => {
                  const def = subCtx.game.definitionOf(c);
                  return def.nameEn === "Garurumon" || (def.types ?? []).includes("Ver.2");
                });

                if (greymonCards.length > 0 && garurumonCards.length > 0) {
                  const chosenGreymon = await subCtx.ask.selectCards(subCtx, {
                    candidates: greymonCards.map((c) => c.instanceId),
                    min: 1,
                    max: 1,
                  });
                  const chosenGarurumon = await subCtx.ask.selectCards(subCtx, {
                    candidates: garurumonCards.map((c) => c.instanceId),
                    min: 1,
                    max: 1,
                  });
                  if (chosenGreymon.length > 0 && chosenGarurumon.length > 0) {
                    await subCtx.fx.playInstances([...chosenGreymon, ...chosenGarurumon], { payCost: false });
                    await subCtx.fx.addSecurity(source.ownerSeat, [source.instanceId], { toTop: true });
                  }
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
