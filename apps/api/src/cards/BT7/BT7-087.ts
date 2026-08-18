import { EffectDuration, EffectTiming, isDigimon, type CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, activated, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { irCardModule } from "../../engine/effects/interpreter.js";

/**
 * BT7-087 — Koji Minamoto (BT7, Blue Tamer).
 *
 *
 * Printed text (no errata):
 *   [Security] Play this card without paying its memory cost.
 *   [Main][Once Per Turn] You may place 5 cards with [Hybrid] in their traits from your
 *   hand under this Tamer in any order to digivolve it into a [MagnaGarurumon] in your
 *   hand for its digivolution cost as if this Tamer is a level 5 blue Digimon.
 *   [Inherited][Your Turn][Once Per Turn] When an effect adds a card to your hand,
 *   gain 1 memory. Then, this Digimon can't be blocked for the turn.
 *
 * Q1658-Q1662: the sub-trigger activates even when an opponent's effect adds to your hand.
 * Must place exactly 5 Hybrid cards. Can only digivolve into MagnaGarurumon.
 */
const cardId = "BT7-087";

const inheritedAddToHandIr: CompiledCard = {
  effects: [{
    trigger: "YourTurn",
    isInherited: true,
    frequency: "OncePerTurn",
    actions: [{
      kind: "SubTrigger",
      event: "whenEffectAddsToHand",
      raw: "When an effect adds a card to your hand",
      actions: [
        { kind: "GainMemory", amount: 1 },
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "cantBeBlocked",
          duration: "forTheTurn",
        },
      ],
    }],
  }],
  coverage: "full",
  residual: [],
};

const inheritedAddToHand = irCardModule(`${cardId}/__add-to-hand`, inheritedAddToHandIr);

// interpreter.ts matchNameOrTrait). "Hybrid" is stored under `forms` in cards.json
// (never `types`), so the trait check must span the full union, not just `types`.
function hasHybridTrait(def: { types?: string[]; forms?: string[]; attributes?: string[] }): boolean {
  const traits = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
  return traits.includes("Hybrid");
}

function isMagnaGarurumon(def: { nameEn: string }): boolean {
  return def.nameEn.includes("MagnaGarurumon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Security] Play this card without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying its memory cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    // [Main][Once Per Turn] Place 5 Hybrid cards from hand under this Tamer,
    // then optionally digivolve into MagnaGarurumon from hand as if this is a level 5 blue Digimon.
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-digivolve`,
          description:
            "[Main][Once Per Turn] You may place 5 cards with [Hybrid] in their traits from " +
            "your hand under this Tamer in any order to digivolve it into a [MagnaGarurumon] " +
            "in your hand for its digivolution cost as if this Tamer is a level 5 blue Digimon.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const owner = ctx.game.player(source.ownerSeat);
            const hybridCount = owner.hand.filter((c) =>
              hasHybridTrait(ctx.game.definitionOf(c)),
            ).length;
            return hybridCount >= 5;
          },
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;

            const owner = ctx.game.player(source.ownerSeat);
            const hybridCards = owner.hand
              .filter((c) => hasHybridTrait(ctx.game.definitionOf(c)));
            const hybridCandidates = hybridCards.map((c) => c.instanceId);

            if (hybridCandidates.length < 5) return;

            // Select 5 Hybrid cards from hand.
            let selected = await ctx.ask.selectCards(ctx, {
              candidates: hybridCandidates,
              min: 5,
              max: 5,
              visibleCards: hybridCards.map((card) => ({
                instanceId: card.instanceId,
                cardId: card.cardId,
              })),
            });

            if (selected.length !== 5) return;

            if (ctx.ask.orderCards !== undefined) {
              selected = await ctx.ask.orderCards(ctx, {
                candidates: selected,
                visibleCards: hybridCards
                  .filter((card) => selected.includes(card.instanceId))
                  .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
                destination: "stackBottom",
              });
            }

            await ctx.fx.placeUnder(me.permanentId, [...selected].reverse());

            // Find MagnaGarurumon in hand.
            const hand = owner.hand;
            const magnaCards = hand.filter((c) => {
              const def = ctx.game.definitionOf(c);
              return isMagnaGarurumon(def);
            });

            if (magnaCards.length === 0) return;

            const [magnaId] = await ctx.ask.selectCards(ctx, {
              candidates: magnaCards.map((card) => card.instanceId),
              min: 0,
              max: 1,
              visibleCards: magnaCards.map((card) => ({
                instanceId: card.instanceId,
                cardId: card.cardId,
              })),
            });
            if (magnaId === undefined) return;

            // Digivolve this permanent into MagnaGarurumon from hand.
            await ctx.fx.digivolveFromInstance(me.permanentId, magnaId, {
              payCost: true,
              ignoreRequirements: true,
              costOverride: 4,
              draw: true,
            });
          },
        }),
      ];
    }

    return inheritedAddToHand.effectsForTiming(timing, source);
  },
};

registerCard(module);
export default module;
