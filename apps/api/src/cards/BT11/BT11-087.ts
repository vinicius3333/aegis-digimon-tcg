import { EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-087";

function isBagraArmy(def: CardDefinition): boolean {
  const types = (def.types ?? []) as string[];
  return types.includes("Bagra Army");
}

function isBagraArmyDigimon(def: CardDefinition): boolean {
  return (def.kinds as string[]).includes("Digimon") && isBagraArmy(def);
}

function isTamer(def: CardDefinition): boolean {
  return (def.kinds as string[]).includes("Tamer");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Trash the top 4 cards of your deck. Then, add up to 2 cards with [Bagra Army]
    // in one of their traits from your trash to your hand, and place up to 2 Digimon cards with
    // [Bagra Army] in their traits from your trash under 1 of your Tamers.
    //
    //   if Tamers exist + Bagra Digimon in trash: selectDigivolutionCards(Bagra Digimon, up to 2)
    //   → selectPermanent(Tamer) → AddDigivolutionCardsBottom.
    //   Q2112: the place-under step requires >= 1 card added to hand.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-mill-recover-bagra`,
          description:
            "[On Play] Trash the top 4 cards of your deck. Then, add up to 2 cards with " +
            "[Bagra Army] in one of their traits from your trash to your hand, and place up to " +
            "2 Digimon cards with [Bagra Army] in their traits from your trash under 1 of your Tamers.",
          optional: false,
          canActivate: (ctx: EffectContext) => ctx.source.isOnBattleArea(),
          resolve: async (ctx: EffectContext) => {
            const owner = ctx.game.player(source.ownerSeat);

            // Step 1: trash top 4 cards from owner's deck (IAddTrashCardsFromLibraryTop).
            const deckCards = owner.deck.slice(0, 4);
            if (deckCards.length > 0) {
              await ctx.fx.trash(deckCards.map((c) => c.instanceId));
            }

            // Step 2: add up to 2 [Bagra Army] cards from trash to hand (any card type).
            const bagraCandidates = owner.trash
              .filter((c) => isBagraArmy(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);

            let addedToHand = 0;

            if (bagraCandidates.length > 0) {
              const maxAdd = Math.min(2, bagraCandidates.length);
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: bagraCandidates,
                min: 1,
                max: maxAdd,
              });
              if (chosen.length > 0) {
                await ctx.fx.returnToHand(chosen);
                addedToHand = chosen.length;
              }
            }

            // Step 3 (Q2112): only proceed if >= 1 card was added to hand in step 2.
            if (addedToHand === 0) return;

            // Must have a Tamer in owner's battle area.
            const tamerPerms = Array.from(owner.battleArea).filter((p) => {
              if (p.topCard === undefined) return false;
              return isTamer(ctx.game.definitionOf(p.topCard));
            });

            if (tamerPerms.length === 0) return;

            // Re-read trash (step 2 may have moved cards out).
            const updatedOwner = ctx.game.player(source.ownerSeat);
            const bagraDigimonCandidates = updatedOwner.trash
              .filter((c) => isBagraArmyDigimon(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);

            if (bagraDigimonCandidates.length === 0) return;

            // Select up to 2 Bagra Army Digimon from trash to place under a Tamer.
            const maxPlace = Math.min(2, bagraDigimonCandidates.length);
            const chosenDigimon = await ctx.ask.selectCards(ctx, {
              candidates: bagraDigimonCandidates,
              min: 1,
              max: maxPlace,
            });

            if (chosenDigimon.length === 0) return;

            // Select 1 Tamer to place the chosen Digimon cards under.
            const chosenTamer = await ctx.ask.chooseTargets(ctx, {
              candidates: tamerPerms.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });

            if (chosenTamer.length === 0) return;

            const tamerPermanentId = chosenTamer[0];
            if (tamerPermanentId === undefined) return;
            await ctx.fx.placeUnder(tamerPermanentId, chosenDigimon);
          },
        }),
      ];
    }

    // [Opponent's Turn] When your opponent moves a Digimon from their breeding area, by
    // trashing 1 of this Digimon's digivolution cards, that Digimon gains "[When Attacking]
    // Lose 3 memory" for the turn.
    //
    // GameEngine.handleMoveFromBreeding fires "whenOpponentMovedFromBreeding" on EVERY
    // breeding->battle move (unconditionally, for either side) — this watcher's own
    // `matches` filters down to moves where the moved permanent's controller is the
    // OPPONENT of Lilithmon's owner. The temporary "[When Attacking] Lose 3 memory"
    // reaction is granted onto the MOVED (arbitrary, non-self) permanent via
    // subscribeSubTrigger, the same primitive BT1-104 uses for a self-targeted grant.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/opponents-turn-watch-move-from-breeding`,
          description:
            "[Opponent's Turn] When your opponent moves a Digimon from their breeding area, " +
            "by trashing 1 of this Digimon's digivolution cards, that Digimon gains " +
            "\"[When Attacking] Lose 3 memory\" for the turn.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const selfPermanentId = self.permanentId;
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);

            ctx.fx.subscribeSubTrigger({
              event: "whenOpponentMovedFromBreeding",
              sourcePermanentId: selfPermanentId,
              once: false,
              description:
                "BT11-087 [Opponent's Turn]: when opponent moves a Digimon from breeding, by " +
                "trashing 1 digivolution card, that Digimon gains \"[When Attacking] Lose 3 memory\".",
              matches: (subCtx) => {
                const movedId = subCtx.trigger.subjectPermanentId;
                if (movedId === undefined) return false;
                const moved = subCtx.game.permanentById(movedId);
                return moved !== undefined && moved.controllerSeat === opponentSeat;
              },
              run: async (subCtx) => {
                const currentSelf = subCtx.game.permanentById(selfPermanentId);
                if (currentSelf === undefined || currentSelf.stack.length === 0) return;

                const wantToPay = await subCtx.ask.optional(
                  subCtx,
                  "Trash 1 of this Digimon's digivolution cards so the moved Digimon gains " +
                    "\"[When Attacking] Lose 3 memory\" for the turn?",
                );
                if (!wantToPay) return;

                const candidates = currentSelf.stack.map((c) => c.instanceId);
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates,
                  min: 1,
                  max: 1,
                });
                if (chosen.length === 0) return;
                await subCtx.fx.trash(chosen);

                const movedId = subCtx.trigger.subjectPermanentId;
                if (movedId === undefined) return;

                subCtx.fx.subscribeSubTrigger({
                  event: "whenAttacking",
                  sourcePermanentId: movedId,
                  once: false,
                  expiresOnTurnEndOf: opponentSeat,
                  description:
                    "BT11-087 granted \"[When Attacking] Lose 3 memory\" for the turn.",
                  matches: (attCtx) => attCtx.trigger.attackerPermanentId === movedId,
                  run: async (attCtx) => {
                    attCtx.fx.gainMemoryForSeat(opponentSeat, -3);
                  },
                });
              },
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
