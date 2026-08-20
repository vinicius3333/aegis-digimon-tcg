import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX6-030";

function hasAngelTrait(def: CardDefinition): boolean {
  return (def.types ?? []).some(
    (t) => t === "Angel" || t === "Archangel" || t === "Three Great Angels",
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] Search your security stack. You may play 1 level 5 or lower " +
            "Digimon card with the [Angel]/[Archangel] trait among them without paying the cost. " +
            "Then, shuffle your security stack, and 1 of your opponent's Digimon gets -7000 DP " +
            "until the end of the turn.",
          optional: true,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const security = [...owner.security];
            if (security.length === 0) return;

            const qualifying = security.filter((c) => {
              const def = ctx.game.definitionOf(c);
              if (!isDigimon(def)) return false;
              if ((def.level ?? 99) > 5) return false;
              return (def.types ?? []).some(
                (t) => t === "Angel" || t === "Archangel",
              );
            });
            const maxCount = Math.min(1, qualifying.length);
            let _played = false;
            if (maxCount > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: qualifying.map((c) => c.instanceId),
                min: 0,
                max: maxCount,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
                _played = true;
              }
            }

            if (owner.security.length > 0) {
              ctx.fx.shuffleSecurity(source.ownerSeat);
            }

            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppPlayer = ctx.game.player(opponent);
            const oppCandidates = Array.from(oppPlayer.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (oppCandidates.length > 0) {
              const targets = await ctx.ask.chooseTargets(ctx, {
                candidates: oppCandidates,
                min: 1,
                max: 1,
              });
              if (targets.length > 0) {
                ctx.fx.modifyDP(targets[0]!, -7000, EffectDuration.UntilEachTurnEnd);
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/protect-angel`,
          description:
            "[All Turns] When one of your Digimon with [Angel]/[Archangel]/[Three Great Angels] " +
            "trait would leave the battle area other than in battle (and not by your own effects), " +
            "by trashing the top card of your security stack, prevent it from leaving.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: self.permanentId,
              mode: "prevent",
              affectsAll: true,
              description:
                "[All Turns] Prevent one of your Angel/Archangel/Three Great Angels trait Digimon " +
                "from leaving the battle area by trashing the top card of your security stack.",
              causeAllows: (_cause, resolvingSeat) => {
                return !("byEffect" === _cause && resolvingSeat === ownerSeat);
              },
              protects: (_subCtx, leavingId) => {
                const leaving = ctx.game.permanentById(leavingId);
                if (leaving === undefined || leaving.topCard === undefined) return false;
                if (leaving.controllerSeat !== ownerSeat) return false;
                if (!isDigimon(ctx.game.definitionOf(leaving.topCard))) return false;
                return hasAngelTrait(ctx.game.definitionOf(leaving.topCard));
              },
              preventCheck: async (subCtx) => {
                const currentSelf = subCtx.game.permanentById(self.permanentId);
                if (currentSelf === undefined) return false;
                const owner = subCtx.game.player(ownerSeat);
                if (owner.security.length === 0) return false;
                const yes = await subCtx.ask.optional(
                  subCtx,
                  "Trash the top card of your security stack to prevent 1 Digimon from leaving?",
                );
                if (!yes) return false;
                await subCtx.fx.trashFromSecurity(ownerSeat, 1, { fromTop: true });
                return true;
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
