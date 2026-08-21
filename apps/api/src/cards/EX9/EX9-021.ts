import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
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
            // Resolve the live permanent from the effect context: during DNA Digivolution the
            // CardSource captured when the effect was registered can still point at the consumed
            // material, while ctx.source resolves the newly-created DNA permanent (Q4768).
            const singleSelf = ctx.source.permanent();
            if (singleSelf === undefined) return;

            if (ctx.trigger?.isDnaDigivolve === true) {
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

    // This is an End-of-Attack timing effect, not a "when this Digimon wins a battle"
    // watcher.  The former implementation subscribed to `whenBattleWon`, which skipped
    // the clause after a direct attack, a loss, or an attack ended by an effect.  The
    // engine already drives EffectTiming.OnEndAttack for every completed attack.
    if (timing === EffectTiming.OnEndAttack) {
      return [
        {
          effectKey: `${cardId}/end-attack-play-from-digi`,
          description:
            "[End of Attack] Once Per Turn When this Digimon attacks, play 1 [Greymon] or " +
            "[Ver.1] card and 1 [Garurumon] or [Ver.2] card from this Digimon's digivolution " +
            "cards without paying the costs. Then, place this Digimon at the top of your " +
            "security stack.",
          // The printed "You may play" makes activation optional.  Once accepted, each
          // available group is mandatory, but a missing group does not prevent the other
          // group from being played (KB Q4767).
          optional: true,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: 1,
          canTrigger: (ctx) =>
            source.isOnBattleArea() && source.permanent()?.permanentId === ctx.trigger?.attackerPermanentId,
          canActivate: (ctx) => {
            const self = source.permanent();
            if (self === undefined) return false;
            return self.stack.some((c) => {
              const def = ctx.game.definitionOf(c);
              return def.nameEn === "Greymon" || def.nameEn === "Garurumon" ||
                (def.types ?? []).includes("Ver.1") || (def.types ?? []).includes("Ver.2");
            });
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const greymonCards = self.stack.filter((c) => {
              const def = ctx.game.definitionOf(c);
              return def.nameEn === "Greymon" || (def.types ?? []).includes("Ver.1");
            });
            const garurumonCards = self.stack.filter((c) => {
              const def = ctx.game.definitionOf(c);
              return def.nameEn === "Garurumon" || (def.types ?? []).includes("Ver.2");
            });
            const chosen: string[] = [];
            if (greymonCards.length > 0) {
              const selected = await ctx.ask.selectCards(ctx, {
                candidates: greymonCards.map((c) => c.instanceId),
                min: 1,
                max: 1,
              });
              chosen.push(...selected);
            }
            if (garurumonCards.length > 0) {
              const selected = await ctx.ask.selectCards(ctx, {
                candidates: garurumonCards.map((c) => c.instanceId).filter((id) => !chosen.includes(id)),
                min: 1,
                max: 1,
              });
              chosen.push(...selected);
            }
            if (chosen.length > 0) {
              await ctx.fx.playInstances(chosen, { payCost: false });
              await ctx.fx.addSecurity(source.ownerSeat, [source.instanceId], { toTop: true });
            }
          },
        },
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
