import { EffectTiming } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-088";

function isOpponentDigimon(perm: Permanent, ctx: EffectContext, ownerSeat: number): boolean {
  if (perm.topCard === undefined) return false;
  const def = ctx.game.definitionOf(perm.topCard);
  return (def.kinds as string[]).includes("Digimon") && perm.controllerSeat !== ownerSeat;
}

async function conditionalTrashHandOrPlaceUnder(ctx: EffectContext, source: CardSource): Promise<void> {
  if (!ctx.source.isOnBattleArea()) return;
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const oppPlayer = ctx.game.player(opponent);

  const oppDigimonCount = Array.from(oppPlayer.battleArea).filter((p) =>
    isOpponentDigimon(p, ctx, source.ownerSeat),
  ).length;

  if (oppDigimonCount <= 1) {
    // Trash 1 card from opponent's hand.
    const handCandidates = oppPlayer.hand.map((c) => c.instanceId);
    if (handCandidates.length === 0) return;
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: handCandidates,
      min: 1,
      max: 1,
    });
    if (chosen.length > 0) {
      await ctx.fx.trash(chosen);
    }
  } else {
    // Place 1 of opponent's Digimon under 1 of opponent's other Digimon as its bottom
    // digivolution card.
    const oppDigimonPerms = Array.from(oppPlayer.battleArea).filter((p) => isOpponentDigimon(p, ctx, source.ownerSeat));
    if (oppDigimonPerms.length < 2) return;

    // Select the Digimon to be placed under.
    const sourceChosen = await ctx.ask.chooseTargets(ctx, {
      candidates: oppDigimonPerms.map((p) => p.permanentId),
      min: 1,
      max: 1,
    });
    if (sourceChosen.length === 0) return;
    const sourcePermanentId = sourceChosen[0]!;

    // Select the receiving Digimon (a different opponent Digimon, non-token, not affected=immune).
    const receiverCandidates = oppDigimonPerms
      .filter((p) => {
        if (p.permanentId === sourcePermanentId) return false;
        // Q5207: can't place under a Digimon that isn't affected by effects.
        if (ctx.fx.isUnaffectableByOpponentEffects?.(p.permanentId)) return false;
        return true;
      })
      .map((p) => p.permanentId);

    if (receiverCandidates.length === 0) return;
    const receiverChosen = await ctx.ask.chooseTargets(ctx, {
      candidates: receiverCandidates,
      min: 1,
      max: 1,
    });
    if (receiverChosen.length === 0) return;

    // Place the source permanent under the receiver (Q2113: source leaves battle area).
    ctx.fx.relocatePermanent(receiverChosen[0]!, sourcePermanentId);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Conditional: trash 1 from opp hand (if <=1 opp Digimon) OR
    //   place 1 opp Digimon under another (if >= 2 opp Digimon).
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-conditional`,
          description:
            "[On Play] If your opponent has 1 or fewer Digimon in play, look at your " +
            "opponent's hand and trash 1 card. If 2 or more, place 1 of your opponent's " +
            "Digimon under 1 of your opponent's other Digimon as its bottom digivolution card.",
          optional: false,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppPlayer = ctx.game.player(opponent);
            const oppDigimonCount = Array.from(oppPlayer.battleArea).filter((p) =>
              isOpponentDigimon(p, ctx, source.ownerSeat),
            ).length;
            if (oppDigimonCount <= 1 && oppPlayer.hand.length >= 1) return true;
            if (oppDigimonCount >= 2) return true;
            return false;
          },
          resolve: async (ctx) => conditionalTrashHandOrPlaceUnder(ctx, source),
        }),
      ];
    }

    // [When Digivolving] Same conditional as [On Play].
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-conditional`,
          description:
            "[When Digivolving] If your opponent has 1 or fewer Digimon in play, look at your " +
            "opponent's hand and trash 1 card. If 2 or more, place 1 of your opponent's " +
            "Digimon under 1 of your opponent's other Digimon as its bottom digivolution card.",
          optional: false,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppPlayer = ctx.game.player(opponent);
            const oppDigimonCount = Array.from(oppPlayer.battleArea).filter((p) =>
              isOpponentDigimon(p, ctx, source.ownerSeat),
            ).length;
            if (oppDigimonCount <= 1 && oppPlayer.hand.length >= 1) return true;
            if (oppDigimonCount >= 2) return true;
            return false;
          },
          resolve: async (ctx) => conditionalTrashHandOrPlaceUnder(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-opponent-stack-watchers`,
          description:
            "[All Turns][Once Per Turn] When an opponent's Digimon digivolves or an effect " +
            "adds cards to its digivolution cards, pay 1 digivolution card to trash their top security.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oncePerTurnKey = `${cardId}/${self.permanentId}/trash-security`;
            const run = async (subCtx: EffectContext) => {
              const currentSelf = subCtx.game.permanentById(self.permanentId);
              if (currentSelf === undefined || currentSelf.stack.length === 0) return;
              if (
                !(await subCtx.ask.optional(
                  subCtx,
                  "Trash 1 digivolution card to trash your opponent's top security card?",
                ))
              )
                return;
              const chosen = await subCtx.ask.selectCards(subCtx, {
                candidates: currentSelf.stack.map((card) => card.instanceId),
                min: 1,
                max: 1,
              });
              if (chosen.length === 0) return;
              await subCtx.fx.trashDigivolutionCards(currentSelf.permanentId, chosen);
              await subCtx.fx.trashFromSecurity(opponent, 1, { fromTop: true });
            };
            const matchesOpponent = (subCtx: EffectContext) => {
              const subjectId = subCtx.trigger.subjectPermanentId;
              const subject = subjectId === undefined ? undefined : subCtx.game.permanentById(subjectId);
              return subject !== undefined && isOpponentDigimon(subject, subCtx, source.ownerSeat);
            };
            for (const event of ["whenOneOfYoursDigivolves", "onAddDigivolutionCards"] as const) {
              ctx.fx.subscribeSubTrigger({
                event,
                sourcePermanentId: self.permanentId,
                once: false,
                oncePerTurnKey,
                description: `${cardId}: opponent's Digimon stack changed`,
                matches: matchesOpponent,
                run,
              });
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
