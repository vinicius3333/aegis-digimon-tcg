import { CardColor, EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT4-030";

/** Whether any digivolution-stack card qualifies: Hybrid-trait Digimon OR Blue Tamer. */
function hasQualifyingDivoCard(ctx: EffectContext, source: CardSource): boolean {
  const me = source.permanent();
  if (me === undefined) return false;
  for (const card of me.stack) {
    const def = ctx.game.definitionOf(card);
    if (isDigimon(def)) {
      const forms = def.forms as string[] | undefined;
      if (forms?.includes("Hybrid")) return true;
    }
    if (isTamer(def) && def.colors.includes(CardColor.Blue)) return true;
  }
  return false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];

    return [
      // ＜Jamming＞ static keyword.
      staticModifier({
        source,
        effectKey: `${cardId}/jamming`,
        description: "＜Jamming＞",
        optional: false,
        resolve: async (ctx) => {
          const me = source.permanent();
          if (me !== undefined) {
            ctx.fx.grantKeyword(me.permanentId, "Jamming", EffectDuration.Permanent);
          }
        },
      }),

      // [Opponent's Turn] If digivolution cards include a [Hybrid] Digimon or Blue Tamer,
      // IsExistOnBattleArea && IsOpponentTurn && DigivolutionCards.Some(CardCondition).)
      staticModifier({
        source,
        effectKey: `${cardId}/cant-be-attacked`,
        description:
          "[Opponent's Turn] If this Digimon's digivolution cards include a Digimon card " +
          "with [Hybrid] in its form or a blue Tamer card, it can't be attacked.",
        optional: false,
        when: (ctx) =>
          ctx.source.isOnBattleArea() &&
          !ctx.source.isOwnersTurn() &&
          hasQualifyingDivoCard(ctx, source),
        resolve: async (ctx) => {
          const me = source.permanent();
          if (me !== undefined) {
            ctx.fx.restrict(me.permanentId, "cantBeAttacked", EffectDuration.UntilOpponentTurnEnd);
          }
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
