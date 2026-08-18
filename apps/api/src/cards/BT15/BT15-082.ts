import { CardColor, CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT15-082 — Sora Takenouchi (BT15, Red Tamer).
 *
 *
 *   EffectTiming.OnStartTurn: if memory <= 2, set memory to 3.
 *   EffectTiming.None (AllTurns continuous SubTrigger): whenCardReturnsFromTrashToHand —
 *     when a Red Digimon returns from the controller's trash to hand, by returning this
 *     Tamer to hand (cost), may play 1 qualifying Red Digimon from hand without cost.
 *     Qualifying: Red Digimon, has at least one of [Avian/Bird/Beast/Animal/Sovereign],
 *     does NOT have [Sea Animal], DP ≤ (13000 - 2000 × opponent.security.length).
 *     KB Q2581: dynamic DP cap scales per opponent security card.
 *   EffectTiming.SecuritySkill: play this Tamer without paying the cost.
 */
const cardId = "BT15-082";

const ELIGIBLE_TYPES = new Set(["Avian", "Bird", "Beast", "Animal", "Sovereign"]);
const EXCLUDED_TYPE = "Sea Animal";

function isEligibleDigimon(def: CardDefinition, opponentSecurityCount: number): boolean {
  if (!(def.kinds as string[]).includes(CardKind.Digimon)) return false;
  if (!(def.colors as string[]).includes(CardColor.Red)) return false;
  const types = (def.types ?? []) as string[];
  if (!types.some((t) => ELIGIBLE_TYPES.has(t))) return false;
  if (types.includes(EXCLUDED_TYPE)) return false;
  const dpCap = 13000 - 2000 * opponentSecurityCount;
  return (def.dp ?? 0) <= dpCap;
}

function isRedDigimon(def: CardDefinition): boolean {
  return (
    (def.kinds as string[]).includes(CardKind.Digimon) &&
    (def.colors as string[]).includes(CardColor.Red)
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Turn] If you have 2 memory or less, set your memory to 3.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-turn-memory`,
          description: "[Start of Your Turn] If you have 2 memory or less, set your memory to 3.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            if (ctx.game.state.memory <= 2) {
              ctx.fx.setMemory(3);
            }
          },
        }),
      ];
    }

    // [All Turns] continuous SubTrigger: whenCardReturnsFromTrashToHand.
    // Fires when a Red Digimon card from the controller's side returns from trash to hand.
    // Cost: return this Tamer to hand.
    // Effect: may play 1 qualifying Red Digimon from hand without paying the cost.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-trash-to-hand-sub`,
          description:
            "[All Turns] When a red Digimon card returns from your trash to your hand, by " +
            "returning this Tamer to the hand, you may play 1 Digimon card with " +
            "[Avian]/[Bird]/[Beast]/[Animal]/[Sovereign] (not [Sea Animal]), DP ≤ " +
            "(13000 - 2000 × opponent security count), from your hand without paying the cost.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeSubTrigger({
              event: "whenCardReturnsFromTrashToHand",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId} red Digimon trash→hand trigger`,
              matches: (subCtx) => {
                const added = subCtx.trigger.addedToHand;
                if (added === undefined || added.instanceIds.length === 0) return false;
                // At least one added card must be a Red Digimon belonging to ownerSeat.
                return added.instanceIds.some((id) => {
                  const ownerPlayer = subCtx.game.player(ownerSeat);
                  const card = ownerPlayer.hand.find((c) => c.instanceId === id);
                  if (card === undefined) return false;
                  return isRedDigimon(subCtx.game.definitionOf(card));
                });
              },
              run: async (subCtx) => {
                // Cost: return this Tamer to hand.
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined) return;
                const bounced = await subCtx.fx.returnToHand([selfPerm.permanentId]);
                if (bounced.length === 0) return;

                // May play 1 qualifying Red Digimon from hand without paying the cost.
                const oppSeat = subCtx.game.opponentOf(ownerSeat);
                const oppSecCount = subCtx.game.player(oppSeat).security.length;
                const ownerPlayer = subCtx.game.player(ownerSeat);
                const candidates = ownerPlayer.hand
                  .filter((c) => isEligibleDigimon(subCtx.game.definitionOf(c), oppSecCount))
                  .map((c) => c.instanceId);

                if (candidates.length === 0) return;

                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates,
                  min: 0,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await subCtx.fx.playInstances(chosen, { payCost: false });
                }
              },
            });
          },
        }),
      ];
    }

    // [Security] Play this card without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([ctx.source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
