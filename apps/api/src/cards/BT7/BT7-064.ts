import { CardColor, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT7-064";

function traitsOf(def: CardDefinition): string[] {
  return [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
}

function hasXAntibodyTrait(def: CardDefinition): boolean {
  return traitsOf(def).some((trait) => trait.toLowerCase() === "x antibody");
}

function stackHasXAntibody(ctx: EffectContext): boolean {
  const self = ctx.source.permanent();
  if (self === undefined) return false;
  for (const card of self.stack) {
    const def = ctx.game.definitionOf(card);
    if (hasXAntibodyTrait(def)) return true;
  }
  return false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] inherited: place 1 black X-Antibody card from hand under this
    // Digimon, then gain deletion immunity + DP immunity until opponent's turn end.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/place-x-antibody-and-protect`,
          description:
            "[When Digivolving] You may place 1 black card with [X-Antibody] in its traits " +
            "from your hand at the bottom of this Digimon's digivolution cards to prevent " +
            "effects from deleting it or reducing its DP until the end of your opponent's next turn.",
          optional: true,
          isInherited: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const hand = ctx.game.player(source.ownerSeat).hand;
            return hand.some((c) => {
              const def = ctx.game.definitionOf(c);
              return (
                def.colors.includes(CardColor.Black) &&
                hasXAntibodyTrait(def)
              );
            });
          },
          resolve: async (ctx) => {
            const hand = ctx.game.player(source.ownerSeat).hand;
            const candidates = hand
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return (
                  def.colors.includes(CardColor.Black) &&
                  hasXAntibodyTrait(def)
                );
              })
              .map((c) => c.instanceId);

            if (candidates.length === 0) return;

            const selected = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 1,
            });
            if (selected.length === 0) return;

            const self = source.permanent();
            if (!self) return;

            await ctx.fx.placeUnder(self.permanentId, selected);

            ctx.fx.restrict(self.permanentId, "beDeleted", EffectDuration.UntilOpponentTurnEnd);
            ctx.fx.restrict(self.permanentId, "dpImmune", EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    }

    // [Your Turn] inherited static: while X-Antibody in traits, SA+1
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/sa-plus-1-while-x-antibody`,
          description:
            "[Your Turn] While this Digimon has [X-Antibody] in its traits, " +
            "it gains <Security Attack +1>.",
          isInherited: true,
          optional: false,
          when: (ctx) =>
            source.isOnBattleArea() &&
            source.isOwnersTurn() &&
            stackHasXAntibody(ctx),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) {
              ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.UntilOwnerTurnEnd, 1);
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
