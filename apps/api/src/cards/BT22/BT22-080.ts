import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { beforePayCost, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT22-080";
const EATER_SPECIES_FORM = "Eater (Species Form)";
const MOTHER_EATER = "Mother Eater";

function isEaterSpeciesForm(ctx: EffectContext, card: CardInstance): boolean {
  return ctx.game.definitionOf(card).nameEn === EATER_SPECIES_FORM;
}

function isMotherEater(ctx: EffectContext, permanent: Permanent): boolean {
  return permanent.topCard !== undefined && ctx.game.definitionOf(permanent.topCard).nameEn === MOTHER_EATER;
}

function isCSTamer(def: CardDefinition): boolean {
  return def.kinds.includes(CardKind.Tamer) && (def.types ?? []).includes("CS");
}

function hasEaterTrait(def: CardDefinition): boolean {
  return [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])].includes("Eater");
}

/** Owner's breeding permanent, or undefined. */
function ownerBreeding(ctx: EffectContext, source: CardSource): Permanent | undefined {
  return ctx.game.player(source.ownerSeat).breeding ?? undefined;
}

/** Mother Eater permanent in the owner's breeding area, or undefined. */
function motherEaterInBreeding(ctx: EffectContext, source: CardSource): Permanent | undefined {
  const breeding = ownerBreeding(ctx, source);
  if (breeding === undefined) return undefined;
  return isMotherEater(ctx, breeding) ? breeding : undefined;
}

/** [Eater (Species Form)] cards in this Digimon's digivolution stack. */
function eaterSpeciesFormInStack(ctx: EffectContext, source: CardSource): CardInstance[] {
  const self = source.permanent();
  if (self === undefined) return [];
  return Array.from(self.stack).filter((card) => isEaterSpeciesForm(ctx, card));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ----- [When Digivolving] -----------------------------------------------
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-move-eater-species-form`,
          description:
            "[When Digivolving] You may place 1 [Eater (Species Form)] from this Digimon's digivolution cards as the bottom digivolution card of your [Mother Eater] in the breeding area.",
          optional: true,
          // at least one [Eater (Species Form)] in this Digimon's digivolution cards.
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() &&
            motherEaterInBreeding(ctx, source) !== undefined &&
            eaterSpeciesFormInStack(ctx, source).length >= 1,
          resolve: async (ctx) => {
            const candidates = eaterSpeciesFormInStack(ctx, source);
            const motherEater = motherEaterInBreeding(ctx, source);
            if (candidates.length === 0 || motherEater === undefined) return;

            let chosenId: string;
            if (candidates.length === 1) {
              chosenId = candidates[0]!.instanceId;
            } else {
              // max 1, optional (canNoSelect: false means must select if eligible).
              const picked = await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((c) => c.instanceId),
                min: 1,
                max: 1,
              });
              if (picked.length === 0) return;
              chosenId = picked[0]!;
            }

            // source AddDigivolutionCardsBottom -> placeUnder with belowTop: true
            // (adds to the END of the stack = bottom digivolution card).
            // removeLooseInstance handles permanent.stack, so the card is cleanly
            // moved from this Digimon's digivolution stack into Mother Eater's stack.
            ctx.fx.placeUnder(motherEater.permanentId, [chosenId], { belowTop: true });
          },
        }),
      ];
    }

    // ----- When this Digimon checks security --------------------------------
    //
    // (checks attackerPermanentId === this Digimon's permanent) AND IsOwnerTurn.
    // maxCountPerTurn: 1 (once per turn).
    //
    // No timing builder exists for OnSecurityCheck; the Effect is constructed
    // directly (card-module contract: one-off card logic).
    if (timing === EffectTiming.OnSecurityCheck) {
      const effect: Effect = {
        effectKey: `${cardId}/on-security-check-play-cs-tamer`,
        description:
          "When this Digimon checks your opponent's security stack, you may play 1 Tamer card with the [CS] trait from your hand without paying the cost.",
        optional: true,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: 1,

        // canTrigger fires during gatherTriggeredEffects which supplies env.triggerInfo
        // (the TriggerInfo for the firing security check), so attackerPermanentId is
        canTrigger: (ctx) => {
          const self = source.permanent();
          return self !== undefined && ctx.trigger.attackerPermanentId === self.permanentId && source.isOwnersTurn();
        },

        // canActivate: must have at least one [CS] Tamer in hand.
        canActivate: (ctx) => {
          const hand = ctx.game.player(source.ownerSeat).hand;
          return hand.some((c) => isCSTamer(ctx.game.definitionOf(c)));
        },

        resolve: async (ctx) => {
          const hand = ctx.game.player(source.ownerSeat).hand;
          const csTamers = hand.filter((c) => isCSTamer(ctx.game.definitionOf(c)));
          if (csTamers.length === 0) return;

          const chosen = await ctx.ask.selectCards(ctx, {
            candidates: csTamers.map((c) => c.instanceId),
            min: 1,
            max: 1,
          });
          if (chosen.length === 0) return;

          await ctx.fx.playFromHand([chosen[0]!], { payCost: false });
        },
      };
      return [effect];
    }

    // ----- [Breeding] inherited play-cost reduction -------------------------
    // The pay-time seam is evaluated by GameEngine for inherited effects carried
    // by the owner's breeding-area stack. This preserves the printed optional
    // choice and makes each physical copy independently once-per-turn.
    if (timing === EffectTiming.None) {
      return [];
    }

    if (timing === EffectTiming.BeforePayCost) {
      return [
        beforePayCost({
          source,
          effectKey: `${cardId}/breeding-ess-eater-cost-reduction`,
          description:
            "[Breeding] [Your Turn] [Once Per Turn] When any of your Digimon cards with the [Eater] trait would be played, you may reduce the play costs by 1.",
          isInherited: true,
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => {
            const playedCardId = ctx.trigger.wouldBePlayedCardId;
            if (playedCardId === undefined) return false;
            return hasEaterTrait(ctx.game.definitionOf({ cardId: playedCardId } as CardInstance));
          },
          resolve: async (ctx) => {
            if (await ctx.ask.optional(ctx, "Reduce the Eater Digimon's play cost by 1?")) {
              ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 1;
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
