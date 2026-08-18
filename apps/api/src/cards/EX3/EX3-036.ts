import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX3-036 — Magnadramon (EX3, Yellow Lv.6 Digimon).
 *
 * declarative effect record: the [On Deletion] clause needs the option-permanent placement path
 * (`ctx.fx.placeOptionAsPermanent`, IR-02 Tier-3) which the generated prose IR could not
 * express (the residual carried a `place-option-as-permanent` missing-primitive flag — now
 * retired).
 *
 * Authoritative text (errata 2022-11-11 — read as the errata; `tools/kb/query.mjs card EX3-036`):
 *   [On Play] All of your opponent's Digimon gain ＜Security Attack -1＞ until the end of your
 *     opponent's turn. If this card was played by [Trial of the Four Great Dragons]'s effect,
 *     all of your opponent's Digimon gain ＜Security Attack -2＞ instead.
 *   [On Deletion] If you don't have a [Trial of the Four Great Dragons] in play, you MAY place
 *     1 [Trial of the Four Great Dragons] from your hand in your battle area. (errata: optional)
 *
 * KB rulings (binding):
 *   - Q3412: the [On Deletion] place is gated on NOT already having a [Trial] in play; the
 *     placed [Trial]'s own "place this card in your battle area" [Main] does NOT re-activate
 *     from this placement.
 *
 * source clause -> Aegis timing:
 *   - OnEnterFieldAnyone (rule implementation; ChangeDigimonSAttackPlayerEffect -1, or -2 when
 *     IsByEffect [Trial]) -> EffectTiming.OnPlay.
 *   - OnDestroyedAnyone (rule implementation; CanActivate: this card is in trash + hand >= 1 +
 *     no [Trial] in play; PlaceDelayOptionCards with CanPlayAsNewPermanent isPlayOption:true)
 *     -> EffectTiming.OnDestroyedAnyone.
 *
 * Effect-driven plays carry `playedByEffectSourceCardId` into the played card's [On Play]
 * context, so the [Trial]-specific -2 branch is distinguished from every other play route.
 */
const cardId = "EX3-036";
const trialName = "Trial of the Four Great Dragons";

const isTrial = (def: CardDefinition): boolean =>
  def.nameEn === trialName || def.nameEn.replace(/\s+/g, "") === trialName.replace(/\s+/g, "");

/** Opponent battle-area Digimon (the ＜Security Attack -1＞ grant targets). */
const opponentDigimon = (ctx: EffectContext, source: CardSource): Permanent[] => {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  return Array.from(ctx.game.player(opponent).battleArea).filter(
    (permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
  );
};

/** Whether the controller already has a [Trial of the Four Great Dragons] in play. */
const hasTrialInPlay = (game: GameAccess, source: CardSource): boolean =>
  Array.from(game.player(source.ownerSeat).battleArea).some(
    (permanent) => permanent.topCard !== undefined && isTrial(game.definitionOf(permanent.topCard)),
  );

/** The controller's hand instance ids of a [Trial of the Four Great Dragons] Option card. */
const trialHandInstanceIds = (game: GameAccess, source: CardSource): string[] => {
  const owner = game.player(source.ownerSeat);
  return Array.from(owner.hand)
    .filter((instance) => isTrial(game.definitionOf(instance)))
    .map((instance) => instance.instanceId);
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] All of your opponent's Digimon gain ＜Security Attack -1＞ until the end of
    // your opponent's turn, or -2 instead when [Trial]'s effect performed this play.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-opponent-security-attack-minus-1`,
          description:
            "[On Play] All of your opponent's Digimon gain ＜Security Attack -1＞ until the " +
            "end of your opponent's turn.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const amount = ctx.trigger.playedByEffectSourceCardId === "EX3-069" ? -2 : -1;
            for (const permanent of opponentDigimon(ctx, source)) {
              ctx.fx.grantKeyword(permanent.permanentId, "SecurityAttack", EffectDuration.UntilOpponentTurnEnd, amount);
            }
          },
        }),
      ];
    }

    // [On Deletion] If you don't have a [Trial of the Four Great Dragons] in play, you MAY
    // place 1 [Trial of the Four Great Dragons] from your hand in your battle area (errata:
    // optional). The [Trial] is an Option-permanent — placed via the option-permanent
    // placement path (it stays in play; it is NOT used-then-trashed).
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-place-trial`,
          description:
            "[On Deletion] If you don't have a [Trial of the Four Great Dragons] in play, you " +
            "may place 1 [Trial of the Four Great Dragons] from your hand in your battle area.",
          optional: true,
          canActivate: (ctx) => !hasTrialInPlay(ctx.game, source) && trialHandInstanceIds(ctx.game, source).length > 0,
          resolve: async (ctx) => {
            // Q3412: gated on NOT already having a [Trial] in play.
            if (hasTrialInPlay(ctx.game, source)) return;
            const candidates = trialHandInstanceIds(ctx.game, source);
            if (candidates.length === 0) return;
            const hand = Array.from(ctx.game.player(source.ownerSeat).hand);
            const [picked] = await ctx.ask.selectCards(ctx, {
              candidates,
              visible: hand.map((instance) => instance.instanceId),
              visibleCards: hand.map((instance) => ({ instanceId: instance.instanceId, cardId: instance.cardId })),
              min: 1,
              max: 1,
            });
            if (picked === undefined) return;
            await ctx.fx.placeOptionAsPermanent?.(picked);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
