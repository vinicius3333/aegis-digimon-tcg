import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { security, turnTiming, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT5-089";

function isGreenLevel6Digimon(def: CardDefinition): boolean {
  return (
    isDigimon(def) &&
    def.level === 6 &&
    def.colors.includes(CardColor.Green)
  );
}

function findAttackingPermanent(ctx: EffectContext): Permanent | undefined {
  const id = ctx.trigger.attackerPermanentId;
  if (id === undefined) return undefined;
  return ctx.game.player(ctx.source.ownerSeat).battleArea.find(
    (p) => p.permanentId === id,
  );
}

function isGreenLevel5DigimonPermanent(ctx: EffectContext, p: Permanent): boolean {
  if (p.inBreeding) return false;
  if (p.topCard === undefined) return false;
  const def = ctx.game.definitionOf(p.topCard);
  if (!isDigimon(def)) return false;
  if (def.level !== 5) return false;
  return def.colors.includes(CardColor.Green);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Turn] If your opponent has a suspended Digimon in play, gain
    // 2 memory.
    //
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-turn-memory`,
          description:
            "[Start of Your Turn] If your opponent has a suspended Digimon in play, " +
            "gain 2 memory.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            return opp.battleArea.some((p) => {
              if (!p.isSuspended) return false;
              if (p.inBreeding) return false;
              if (p.topCard === undefined) return false;
              return isDigimon(ctx.game.definitionOf(p.topCard));
            });
          },
          resolve: async (ctx) => {
            ctx.fx.gainMemory(2);
          },
        }),
      ];
    }

    // [Your Turn] When you attack with a level 5 green Digimon, you may suspend
    // this Tamer to reveal 3 cards from the top of your deck. You may digivolve
    // 1 green level 6 Digimon card among them onto the attacking Digimon without
    // paying its memory cost. Place the remaining cards at the bottom of your deck
    // in any order.
    //
    //     optional play (digivolve onto attacker).
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          attackScope: "ally",
          effectKey: `${cardId}/when-attacking-reveal-digivolve`,
          description:
            "[Your Turn] When you attack with a level 5 green Digimon, you may " +
            "suspend this Tamer to reveal 3 cards from the top of your deck. You " +
            "may digivolve 1 green level 6 Digimon card among them onto the attacking " +
            "Digimon without paying its memory cost. Place the remaining cards at the " +
            "bottom of your deck in any order.",
          optional: true,
          // Gate: source (Tamer) is on battle area + owner's turn + attacker is Lv.5 Green.
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (!ctx.source.isOwnersTurn()) return false;
            const attacker = findAttackingPermanent(ctx);
            if (attacker === undefined) return false;
            return isGreenLevel5DigimonPermanent(ctx, attacker);
          },
          // Must be able to suspend (not already suspended).
          canActivate: () => {
            const self = source.permanent();
            return self !== undefined && !self.isSuspended;
          },
          resolve: async (ctx) => {
            const selfPerm = source.permanent();
            if (selfPerm === undefined || selfPerm.isSuspended) return;

            const attacker = findAttackingPermanent(ctx);
            if (attacker === undefined) return;

            // Suspend this Tamer.
            await ctx.fx.suspend([selfPerm.permanentId]);

            // Reveal top 3 cards of owner's deck.
            const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
            if (revealed.length === 0) return;

            // Select up to 1 green Lv.6 Digimon to digivolve onto attacker.
            const digivolveCandidates = revealed
              .filter((c) => isGreenLevel6Digimon(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);

            let selectedId: string | undefined;
            if (digivolveCandidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: digivolveCandidates,
                min: 0,
                max: 1,
                visible: revealed.map((card) => card.instanceId),
                visibleCards: revealed.map((card) => ({
                  instanceId: card.instanceId,
                  cardId: card.cardId,
                })),
              });
              if (chosen.length > 0) {
                selectedId = chosen[0]!;
              }
            }

            // Remaining revealed cards go to deck bottom in any order.
            let rest = revealed
              .filter((c) => c.instanceId !== selectedId)
              .map((c) => c.instanceId);
            const returnRestToBottom = async (): Promise<void> => {
              if (rest.length > 1 && ctx.ask.orderCards !== undefined) {
                rest = await ctx.ask.orderCards(ctx, {
                  candidates: rest,
                  visibleCards: revealed
                    .filter((card) => rest.includes(card.instanceId))
                    .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
                });
              }
              if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
            };

            if (selectedId === undefined) {
              await returnRestToBottom();
              return;
            }

            const digivolved = await ctx.fx.digivolveFromInstance(
              attacker.permanentId,
              selectedId,
              {
                payCost: false,
                // KB Q1363: finish this Tamer's remaining-card placement before the
                // entered card's [When Digivolving] effects may activate.
                beforeWhenDigivolving: returnRestToBottom,
              },
            );
            if (digivolved === undefined) {
              await ctx.fx.returnToDeck(revealed.map((card) => card.instanceId), { toTop: false });
            }
          },
        }),
      ];
    }

    // [Security] Play this Tamer without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this Tamer without paying its memory cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
