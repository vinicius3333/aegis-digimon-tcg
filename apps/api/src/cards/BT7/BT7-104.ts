import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT7-104";

/** documented behavior CardTraits = Form ∪ Attribute ∪ Type (documented behavior). */
function traitsOf(def: CardDefinition): string[] {
  return [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
}

/** TopCard.HasXAntibodyTraits — the data stores the trait as "X Antibody". */
function hasXAntibodyTrait(def: CardDefinition): boolean {
  return traitsOf(def).some((trait) => trait.toLowerCase() === "x antibody");
}

/** Owner battle-area Digimon whose top card carries the [X Antibody] trait. */
function targets(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter((permanent) => {
    if (permanent.topCard == null) return false;
    const def = ctx.game.definitionOf(permanent.topCard);
    return isDigimon(def) && hasXAntibodyTrait(def);
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ----- [Main] choose an [X Antibody] Digimon, draw per its digivolution cards -----
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-x-antibody-draw`,
          description:
            "[Main] Choose 1 of your Digimon with [X-Antibody] in its traits. Then, <Draw 1> for each of that Digimon's digivolution cards.",
          optional: false,
          canActivate: (ctx) => targets(ctx, source).length >= 1,
          resolve: async (ctx) => {
            const eligible = targets(ctx, source);
            if (eligible.length === 0) return;

            // identical tops to their distinct stacks.
            const byPermanentId = new Map<string, Permanent>(
              eligible.map((permanent) => [permanent.permanentId, permanent]),
            );
            const chosen =
              eligible.length === 1
                ? [eligible[0]!.permanentId]
                : await ctx.ask.chooseTargets(ctx, {
                    candidates: Array.from(byPermanentId.keys()),
                    min: 1,
                    max: 1,
                  });
            const chosenPermanentId = chosen[0];
            if (chosenPermanentId === undefined) return;
            const chosenPermanent = byPermanentId.get(chosenPermanentId);
            if (chosenPermanent === undefined) return;

            // <Draw 1> for each of that Digimon's digivolution cards (documented behavior rule implementation with
            // count = selectedPermanent.DigivolutionCards.Count; no draw when 0).
            const drawCount = chosenPermanent.stack.length;
            if (drawCount >= 1) {
              await ctx.fx.draw(source.ownerSeat, drawCount);
            }
          },
        }),
      ];
    }

    // ----- [Security] add this card to its owner's hand -------------------------------
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-add-hand`,
          description: "[Security] Add this card to its owner's hand.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
