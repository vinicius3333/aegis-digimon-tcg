import { CardColor, CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-033";

function isBlackDigimon(ctx: EffectContext, permanent: Permanent): boolean {
  const definition = ctx.game.definitionOf(permanent.topCard);
  return (
    definition.kinds.includes(CardKind.Digimon) &&
    definition.colors.includes(CardColor.Black)
  );
}

function meetsThreshold(ctx: EffectContext, permanentId: string): boolean {
  const permanent = ctx.game.permanentById(permanentId);
  return (
    permanent !== undefined &&
    isBlackDigimon(ctx, permanent) &&
    permanent.currentDP >= 13_000
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];

    return [
      staticModifier({
        source,
        effectKey: `${cardId}/all-black-13000-piercing`,
        description:
          "[Your Turn] All of your black Digimon with 13000 DP or more gain Piercing.",
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          for (const permanent of ctx.game.player(source.ownerSeat).battleArea) {
            if (!isBlackDigimon(ctx, permanent)) continue;
            const permanentId = permanent.permanentId;
            ctx.fx.grantKeyword(
              permanentId,
              "Piercing",
              EffectDuration.Permanent,
              undefined,
              { active: () => meetsThreshold(ctx, permanentId) },
            );
          }
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-black-13000-security-attack`,
        description:
          "[Your Turn] While this Digimon is black and has 13000 DP or more, it gains Security Attack +1.",
        isInherited: true,
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          const permanentId = host.permanentId;
          ctx.fx.grantKeyword(
            permanentId,
            "SecurityAttack",
            EffectDuration.Permanent,
            1,
            { active: () => meetsThreshold(ctx, permanentId) },
          );
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
