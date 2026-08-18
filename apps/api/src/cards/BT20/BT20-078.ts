import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT20-078";

function isEligibleOpponentTarget(def: CardDefinition): boolean {
  const kinds = def.kinds as string[];
  if (!kinds.includes("Digimon") && !kinds.includes("Tamer")) return false;
  return def.playCost !== undefined && def.playCost <= 4;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Static] ＜Collision＞ and ＜Blocker＞ — granted each static pass while on battle area.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/static-collision`,
          description: "＜Collision＞",
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm !== undefined) {
              ctx.fx.grantKeyword(perm.permanentId, "Collision", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/static-blocker`,
          description: "＜Blocker＞",
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm !== undefined) {
              ctx.fx.grantKeyword(perm.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    // [On Deletion] Delete 1 of your opponent's Digimon or Tamers with play cost of 4 or less.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-delete-opp`,
          description:
            "[On Deletion] Delete 1 of your opponent's Digimon or Tamers with a play cost of 4 or less.",
          optional: false,
          canActivate: (ctx) => {
            const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
            return ctx.game.player(opponentSeat).battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              return isEligibleOpponentTarget(ctx.game.definitionOf(p.topCard));
            });
          },
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
            const candidates = ctx.game
              .player(opponentSeat)
              .battleArea.filter((p) => {
                if (p.topCard === undefined) return false;
                return isEligibleOpponentTarget(ctx.game.definitionOf(p.topCard));
              })
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const chosen =
              candidates.length === 1
                ? candidates[0]!
                : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];

            if (chosen !== undefined) {
              await ctx.fx.deletePermanent([chosen]);
            }
          },
        }),
      ];
    }

    // [All Turns] OncePerTurn: when effects digivolve opponent's Digimon, DeDigivolve 1.
    // RESIDUAL: SubTrigger watcher (effect-driven digivolve event) not available in EffectModule API.

    return [];
  },
};

registerCard(module);
export default module;
