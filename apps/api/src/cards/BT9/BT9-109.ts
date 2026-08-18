import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import {
  activated,
  colorWaiverStatic,
  security,
  staticModifier,
  whenAttacking,
} from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchingAlternateDigivolutionRequirement, matchingEvoCost } from "../../engine/cards/cardData.js";


const cardId = "BT9-109";
const xAntibodyName = "X Antibody";

/**
 * "Until the end of each turn." There is no Permanent duration in EffectDuration; the
 * <Use Req.> waiver is a persistent static recorded every continuous-recompute pass
 * (the engine re-fires EffectTiming.None effects each pass), so a per-turn duration
 * that the recompute refreshes is the correct continuous mapping (mirrors BT25-101).
 */
const staticDuration = EffectDuration.UntilEachTurnEnd;

/** This card's owner's battle-area Digimon (top card is a Digimon), source GetBattleAreaDigimons. */
function ownerBattleAreaDigimons(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter(
    (permanent) => permanent.topCard != null && isDigimon(ctx.game.definitionOf(permanent.topCard)),
  );
}

/** Does this digivolution-stack card carry the [X Antibody] name? (source CardNames.Contains). */
function isXAntibodyCard(ctx: EffectContext, card: CardInstance): boolean {
  return ctx.game.definitionOf(card).nameEn === xAntibodyName;
}

/**
 * Owner battle-area Digimon that do NOT already have an [X Antibody] in their
 * digivolution cards (source CanSelectPermanentCondition: on the owner's battle area,
 * a Digimon, and 0 stack cards named "X Antibody").
 */
function placeTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  return ownerBattleAreaDigimons(ctx, source).filter(
    (permanent) => !Array.from(permanent.stack).some((card) => isXAntibodyCard(ctx, card)),
  );
}

function hasXAntibodyTrait(definition: CardDefinition): boolean {
  return (definition.types ?? []).some((trait) => trait.toLowerCase() === xAntibodyName.toLowerCase());
}

function legalXAntibodyDigivolutions(ctx: EffectContext, source: CardSource): CardInstance[] {
  const host = source.permanent();
  if (host?.topCard === undefined) return [];
  const base = ctx.game.definitionOf(host.topCard);
  return Array.from(ctx.game.player(source.ownerSeat).hand).filter((card) => {
    const into = ctx.game.definitionOf(card);
    return (
      isDigimon(into) &&
      hasXAntibodyTrait(into) &&
      (matchingEvoCost(into, base) !== undefined || matchingAlternateDigivolutionRequirement(into, base) !== undefined)
    );
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // --- Continuous / static + the two inherited markers (EffectTiming.None) ---------
    if (timing === EffectTiming.None) {
      return [
        // While you have a Digimon in play, you may use this card without meeting its
        // `GetBattleAreaDigimons().Count >= 1`). Recorded as a color-requirement waiver
        // on this card; the play/use color-cost check reads it.
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/use-req-color-waiver`,
          description:
            "While you have a Digimon in play, you may use this card without meeting its color requirements.",
          optional: false,
          when: (ctx) => ownerBattleAreaDigimons(ctx, source).length >= 1,
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(source.instanceId, staticDuration);
          },
        }),

        // [All Turns] (inherited) Effects can't trash [X Antibody] in this Digimon's
        // digivolution cards (source rule implementation).
        //
        // The instance-scoped lock is consumed only by effect-driven digivolution-card
        // trashing. It filters this source while leaving neighboring cards trashable (Q1922);
        // rule-driven identity cleanup remains unaffected (Q1606/Q2167).
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-x-antibody-trash-lock`,
          description: "[All Turns] Effects can't trash [X Antibody] in this Digimon's digivolution cards.",
          optional: false,
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            ctx.fx.stackCardTrashLock?.(source.instanceId, source.ownerSeat, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // --- [Security] Gain 1 memory, and add this card to its owner's hand -------------
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-memory-add-hand`,
          description: "[Security] Gain 1 memory, and add this card to its owner's hand.",
          optional: false,
          resolve: async (ctx) => {
            // Gain 1 memory (source Owner.AddMemory(1)). [Security] resolves during the
            // ATTACKING player's turn against the DEFENDING owner's security stack, so
            // turnSeat is always the opponent here -- must credit source.ownerSeat, not
            // turnSeat (ctx.fx.gainMemory would always pay the wrong player).
            ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);

            // Add the just-revealed security card to its owner's hand. The security
            // resolver runs a [Security] effect WHILE the revealed card is still in the
            // security stack (security/securityCheck.ts resolves the effect, THEN removes
            // the card by instanceId, THEN trashes only if still loose). So
            // `returnToHand([source.instanceId])` locates the instance in security,
            // moves it to hand, and the resolver's later removal/trash sweep skips it —
            // the card is now in hand, exactly as printed. (`removeLooseInstance`/
            // `collectForReturn` both scan the security zone.)
            await ctx.fx.returnToHand([ctx.source.instanceId]);
          },
        }),
      ];
    }

    // --- [Main] Place this card under 1 of your Digimon w/o [X Antibody] -------------
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-place-under`,
          description:
            "[Main] Place this card under 1 of your Digimon without [X Antibody] in its digivolution cards as its bottom digivolution card.",
          optional: false,
          canActivate: (ctx) => placeTargets(ctx, source).length >= 1,
          resolve: async (ctx) => {
            const targets = placeTargets(ctx, source);
            if (targets.length === 0) return;

            // the choice bound to the permanent and its stack metadata in the client.
            const permanentById = new Map<string, Permanent>(
              targets.map((permanent) => [permanent.permanentId, permanent]),
            );
            const chosen =
              targets.length === 1
                ? [targets[0]!.permanentId]
                : await ctx.ask.chooseTargets(ctx, {
                    candidates: Array.from(permanentById.keys()),
                    min: 1,
                    max: 1,
                  });
            const chosenPermanentId = chosen[0];
            if (chosenPermanentId === undefined) return;
            const chosenPermanent = permanentById.get(chosenPermanentId);
            if (chosenPermanent === undefined) return;

            // Place THIS card as the bottom digivolution card (source
            // AddDigivolutionCardsBottom; placeUnder's default is the bottom of the stack).
            ctx.fx.placeUnder(chosenPermanent.permanentId, [source.instanceId]);
          },
        }),
      ];
    }

    // --- [When Attacking] (inherited) digivolve into an [X Antibody]-trait Digimon ---
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-x-antibody-digivolve`,
          description:
            "[When Attacking] This Digimon can digivolve into a Digimon card with [X Antibody] in its traits in your hand for its digivolution cost.",
          optional: true,
          isInherited: true,
          canActivate: (ctx) => legalXAntibodyDigivolutions(ctx, source).length > 0,
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host === undefined) return;
            const candidates = legalXAntibodyDigivolutions(ctx, source);
            if (candidates.length === 0) return;
            const picked = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((card) => card.instanceId),
              min: 1,
              max: 1,
            });
            if (picked[0] === undefined) return;
            await ctx.fx.digivolveFromInstance(host.permanentId, picked[0], {
              payCost: true,
              draw: true,
              useAlternateCost: true,
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
