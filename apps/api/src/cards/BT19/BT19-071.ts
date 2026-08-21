import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT19-071";

/** Trash top 2 + grant Blocker until opponent turn end — shared by OnPlay and WhenDigivolving. */
async function trashAndGrantBlocker(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  if (owner.deck.length >= 1) {
    const toTrash = owner.deck.slice(0, 2).map((c) => c.instanceId);
    if (toTrash.length > 0) {
      await ctx.fx.trash(toTrash);
    }
  }
  const selfPermanent = ctx.source.permanent();
  if (selfPermanent) {
    ctx.fx.grantKeyword(selfPermanent.permanentId, "Blocker", EffectDuration.UntilOpponentTurnEnd);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Trash top 2 from own deck + gain ＜Blocker＞ until opponent's turn end.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-trash-and-blocker`,
          description:
            "[On Play] Trash the top 2 cards of your deck. Then, this Digimon gains " +
            "＜Blocker＞ until the end of your opponent's turn.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await trashAndGrantBlocker(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] Same as [On Play].
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-trash-and-blocker`,
          description:
            "[When Digivolving] Trash the top 2 cards of your deck. Then, this Digimon " +
            "gains ＜Blocker＞ until the end of your opponent's turn.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await trashAndGrantBlocker(ctx, source);
          },
        }),
      ];
    }

    // [All Turns][Once Per Turn] When effects trash cards from your deck, delete 1 of your
    // opponent's Lv.5 or lower Digimon.
    // Continuous static that re-installs the SubTrigger watcher each recompute pass.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-deck-trash-delete`,
          description:
            "[All Turns][Once Per Turn] When effects trash cards from your deck, delete 1 " +
            "of your opponent's level 5 or lower Digimon.",
          optional: false,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const selfPermanent = ctx.source.permanent();
            if (!selfPermanent) return;
            ctx.fx.subscribeSubTrigger({
              event: "onDiscardLibrary",
              sourcePermanentId: selfPermanent.permanentId,
              once: false,
              oncePerTiming: true,
              description:
                `${cardId} [All Turns][Once Per Turn] when own deck trashed → delete ` +
                "1 opponent Lv.5 or lower Digimon",
              matches: (subCtx) => {
                // Gate: the milled deck must belong to this card's controller.
                const deckSeat = subCtx.trigger?.addedToHand?.byEffect?.ownerSeat;
                return deckSeat === source.ownerSeat;
              },
              run: async (subCtx) => {
                const opponentSeat = subCtx.game.opponentOf(source.ownerSeat);
                const opponent = subCtx.game.player(opponentSeat);
                const targets = opponent.battleArea.filter((perm) => {
                  if (perm.inBreeding || !perm.topCard) return false;
                  const def = subCtx.game.definitionOf(perm.topCard);
                  if (!(def.kinds as string[]).includes(CardKind.Digimon)) return false;
                  return def.level !== undefined && def.level !== null && def.level <= 5;
                });
                if (targets.length === 0) return;
                const chosen = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: targets.map((p) => p.permanentId),
                  min: 1,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await subCtx.fx.deletePermanent([chosen[0]!]);
                }
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
