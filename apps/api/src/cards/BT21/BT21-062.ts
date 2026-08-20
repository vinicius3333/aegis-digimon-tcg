import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT21-062";

/**
 * "Cards with [Vemmon] in their texts" — documented behavior `CardSource.HasText` (documented behavior) scans the
 * card name, every printed effect text (main, inherited, security), and the trait lists. Matching
 * only the name and the type list missed the Digimon whose effect text references [Vemmon], which
 * left the [When Digivolving] cost unpayable and the effect silently unofferable.
 */
function hasVemmonInText(def: CardDefinition): boolean {
  const haystack = [
    def.nameEn,
    def.effectText,
    def.inheritedEffectText,
    def.securityEffectText,
    ...(def.forms ?? []),
    ...(def.attributes ?? []),
    ...(def.types ?? []),
  ];
  return haystack.some((text) => text?.includes("Vemmon") === true);
}

function isRagnarokCannon(def: CardDefinition): boolean {
  return def.nameEn === "Ragnarok Cannon";
}

function isVemmon(def: CardDefinition): boolean {
  return def.nameEn === "Vemmon";
}

/** Opponent's battle-area Digimon not in breeding, with the card definition. */
function opponentDigimon(ctx: EffectContext): string[] {
  const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
  return ctx.game
    .player(opponentSeat)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      return isDigimon(ctx.game.definitionOf(p.topCard));
    })
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] By placing 4 cards with [Vemmon] in their texts from your trash as
    // this Digimon's bottom digivolution cards, you may use 1 [Ragnarok Cannon] from your
    // hand or trash without paying the cost. (documented behavior)
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-place-vemmon-use-ragnarok`,
          description:
            "[When Digivolving] By placing 4 cards with [Vemmon] in their texts from your trash " +
            "as this Digimon's bottom digivolution cards, you may use 1 [Ragnarok Cannon] from " +
            "your hand or trash without paying the cost.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const owner = ctx.game.player(ctx.source.ownerSeat);
            const count = owner.trash.filter((c) => hasVemmonInText(ctx.game.definitionOf(c))).length;
            return count >= 4;
          },
          resolve: async (ctx) => {
            if (!ctx.source.isOnBattleArea()) return;
            const owner = ctx.game.player(ctx.source.ownerSeat);
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;

            // Select 4 cards with [Vemmon] in text from trash to place as bottom digivolution cards.
            const candidates = owner.trash
              .filter((c) => hasVemmonInText(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);

            if (candidates.length < 4) return;

            // KB Q4570: must place exactly 4 (canEndNotMax: false).
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 4,
              max: 4,
            });
            if (chosen.length < 4) return;

            await ctx.fx.placeUnder(selfPerm.permanentId, chosen);

            // Now: use 1 [Ragnarok Cannon] from hand or trash without paying cost.
            const handCandidates = owner.hand
              .filter((c) => isRagnarokCannon(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            const trashCandidates = owner.trash
              .filter((c) => isRagnarokCannon(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);

            if (handCandidates.length === 0 && trashCandidates.length === 0) return;

            // If both have options, ask from which zone; else auto-select.
            let fromInstances: string[] = [];
            if (handCandidates.length > 0 && trashCandidates.length > 0) {
              const pickedHand = await ctx.ask.selectCards(ctx, {
                candidates: handCandidates,
                min: 0,
                max: 1,
              });
              if (pickedHand.length > 0) {
                fromInstances = pickedHand;
              } else {
                const pickedTrash = await ctx.ask.selectCards(ctx, {
                  candidates: trashCandidates,
                  min: 0,
                  max: 1,
                });
                fromInstances = pickedTrash;
              }
            } else if (handCandidates.length > 0) {
              const picked = await ctx.ask.selectCards(ctx, {
                candidates: handCandidates,
                min: 0,
                max: 1,
              });
              fromInstances = picked;
            } else {
              const picked = await ctx.ask.selectCards(ctx, {
                candidates: trashCandidates,
                min: 0,
                max: 1,
              });
              fromInstances = picked;
            }

            if (fromInstances.length > 0) {
              await ctx.fx.playInstances(fromInstances, { payCost: false });
            }
          },
        }),
      ];
    }

    // [Start of Your Main Phase] Delete 1 of your opponent's Digimon. (documented behavior)
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-phase-delete-opponent`,
          description: "[Start of Your Main Phase] Delete 1 of your opponent's Digimon.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const targets = opponentDigimon(ctx);
            if (targets.length === 0) return;
            const target =
              targets.length === 1
                ? targets[0]!
                : (await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 }))[0];
            if (target !== undefined) {
              await ctx.fx.deletePermanent([target]);
            }
          },
        }),
      ];
    }

    // [All Turns] When this Digimon would leave the battle area, by returning 4 [Vemmon] from
    // this Digimon's digivolution cards to the bottom of the deck, prevent it from leaving.
    // (documented behavior) Implemented via subscribeReplacement wouldLeavePlay.
    // This is installed at OnEnterFieldAnyone (when this Digimon enters the field).
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        {
          effectKey: `${cardId}/on-enter-install-leave-prevention`,
          description:
            "[All Turns] Install leave-prevention: when this Digimon would leave the battle area, " +
            "by returning 4 [Vemmon] from digivolution cards to the bottom of the deck, prevent it.",
          optional: false,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: -1,
          canTrigger: (ctx) => {
            // Only fires when the entering permanent is THIS card.
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            const perm = ctx.game.permanentById(subjectId);
            if (perm === undefined || perm.topCard === undefined) return false;
            return perm.topCard.instanceId === source.instanceId;
          },
          canActivate: () => true,
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;
            const selfPermanentId = selfPerm.permanentId;

            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: selfPermanentId,
              mode: "prevent",
              description:
                "BT21-062 [All Turns]: when this Digimon would leave, return 4 [Vemmon] to prevent it.",
              protects: (_subCtx, leavingPermanentId) => leavingPermanentId === selfPermanentId,
              preventCheck: async (subCtx, leavingPermanentId) => {
                if (leavingPermanentId !== selfPermanentId) return false;
                const perm = subCtx.game.permanentById(selfPermanentId);
                if (perm === undefined) return false;

                // Check: 4+ [Vemmon] in digivolution stack.
                const vemmonInStack = perm.stack.filter((c) =>
                  isVemmon(subCtx.game.definitionOf(c)),
                );
                if (vemmonInStack.length < 4) return false;

                // KB Q4571: must return exactly 4.
                const candidates = vemmonInStack.map((c) => c.instanceId);
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates,
                  min: 4,
                  max: 4,
                });
                if (chosen.length < 4) return false;

                // Return chosen 4 to the bottom of the deck (toTop: false = bottom).
                await subCtx.fx.returnToDeck(chosen);
                return true;
              },
            });
          },
        },
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
