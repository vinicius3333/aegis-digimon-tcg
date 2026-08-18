import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST12-11";

const isHuckmonOrSistermon = (def: CardDefinition): boolean => {
  if (!isDigimon(def)) return false;
  return def.nameEn.includes("Huckmon") || def.nameEn.includes("Sistermon");
};

function trashTargetIds(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.trash)
    .filter((c) => isHuckmonOrSistermon(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);
}

function opponentDigimonIds(ctx: EffectContext, source: CardSource): string[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const ids: string[] = [];
  for (const p of opponent.battleArea) {
    if (p.inBreeding) continue;
    if (!p.topCard) continue;
    if (!isDigimon(ctx.game.definitionOf(p.topCard))) continue;
    ids.push(p.permanentId);
  }
  return ids;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Play 1 Huckmon or Sistermon-name Digimon from trash free.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-play-from-trash`,
          description:
            "[When Digivolving] You may play 1 [Huckmon] or 1 Digimon card with [Sistermon] " +
            "in its name in your trash without paying its memory cost.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            return trashTargetIds(ctx, source).length > 0;
          },
          resolve: async (ctx) => {
            const candidates = trashTargetIds(ctx, source);
            if (candidates.length === 0) return;
            const [chosen] = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 1,
            });
            if (chosen === undefined) return;
            await ctx.fx.playInstances([chosen], { payCost: false });
          },
        }),
      ];
    }

    // [Your Turn][Once Per Turn] When you play another Digimon by an effect,
    // De-Digivolve 1 up to 2 of your opponent's Digimon.
    // Modeled as a staticModifier that installs a whenPlayed SubTrigger watcher.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-effect-play-dedigivolve`,
          description:
            "[Your Turn][Once Per Turn] When you play another Digimon by an effect, " +
            "＜De-Digivolve 1＞ up to 2 of your opponent's Digimon.",
          maxPerTurn: 1,
          when: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent?.();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              description: `${cardId} [Your Turn] other Digimon played by effect → De-Digivolve 1 up to 2 opponents`,
              matches: (subCtx) => {
                // Only on owner's turn.
                if (!source.isOwnersTurn()) return false;
                // Must be played by an effect.
                if (!subCtx.trigger?.playedByEffect) return false;
                // The played Digimon must be a different own Digimon (excludeSelf + own).
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (!subjectId) return false;
                if (subjectId === self.permanentId) return false;
                const perm = subCtx.game.permanentById(subjectId);
                if (!perm || !perm.topCard) return false;
                if (perm.controllerSeat !== source.ownerSeat) return false;
                return isDigimon(subCtx.game.definitionOf(perm.topCard));
              },
              run: async (subCtx) => {
                const targets = opponentDigimonIds(subCtx, source);
                if (targets.length === 0) return;
                const max = Math.min(2, targets.length);
                const chosen = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: targets,
                  min: 1,
                  max,
                });
                for (const permanentId of chosen) {
                  subCtx.fx.deDigivolve(permanentId, 1);
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
