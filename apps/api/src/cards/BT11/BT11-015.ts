import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-015";

function hasShoutmonSource(ctx: EffectContext, source: CardSource): boolean {
  return source.permanent()?.stack.some((card) =>
    matchNameOrTrait(ctx.game.definitionOf(card), { tokens: ["Shoutmon"], match: "name" })
  ) ?? false;
}

async function deleteLowDp(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const candidates = ctx.game.player(opponent).battleArea.filter((permanent) =>
    permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)) && permanent.currentDP <= 4000
  );
  const max = Math.min(hasShoutmonSource(ctx, source) ? 2 : 1, candidates.length);
  if (max === 0) return;
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map(({ permanentId }) => permanentId),
    min: max,
    max,
  });
  if (chosen.length > 0) await ctx.fx.deletePermanent(chosen);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [whenDigivolving({
        source,
        effectKey: `${cardId}/when-digivolving-delete`,
        description:
          "[When Digivolving] Delete 1 opposing Digimon with 4000 DP or less, or 2 " +
          "if [Shoutmon] is in this Digimon's digivolution cards.",
        resolve: (ctx) => deleteLowDp(ctx, source),
      })];
    }
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [onDeletion({
        source,
        effectKey: `${cardId}/save`,
        description: "[On Deletion] ＜Save＞",
        optional: true,
        resolve: async (ctx) => {
          const tamers = ctx.game.player(source.ownerSeat).battleArea.filter((permanent) =>
            permanent.topCard !== undefined && isTamer(ctx.game.definitionOf(permanent.topCard))
          );
          if (tamers.length === 0) return;
          const [tamer] = await ctx.ask.chooseTargets(ctx, {
            candidates: tamers.map(({ permanentId }) => permanentId), min: 1, max: 1,
          });
          if (tamer !== undefined) await ctx.fx.placeUnder(tamer, [source.instanceId]);
        },
      })];
    }
    if (timing === EffectTiming.None) {
      return [staticModifier({
        source,
        effectKey: `${cardId}/inherited-security-attack`,
        description:
          "[Your Turn] While this Digimon has [Shoutmon] in its name, it gains ＜Security Attack +1＞.",
        isInherited: true,
        when: (ctx) => {
          const host = source.permanent();
          return source.isOwnersTurn() && host?.topCard !== undefined &&
            matchNameOrTrait(ctx.game.definitionOf(host.topCard), { tokens: ["Shoutmon"], match: "name" });
        },
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host !== undefined) ctx.fx.grantKeyword(host.permanentId, "SecurityAttack", EffectDuration.Permanent, 1);
        },
      })];
    }
    return [];
  },
};

registerCard(module);
export default module;
