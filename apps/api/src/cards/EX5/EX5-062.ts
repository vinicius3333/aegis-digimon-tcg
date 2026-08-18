import { CardColor, CardKind, EffectTiming, type Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, activated, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX5-062";

/**
 * EX5-062 — EX5 Purple Digimon.
 *
 * [When Digivolving] [Once Per Turn]: trash up to 3 hand cards, then play 1 purple
 * Digimon from trash with play cost reduced by (3 + number of cards trashed by this effect).
 * Dynamic scaling: reduceCost = 3 + trashedCount (documented behavior).
 *
 * [Main] [Once Per Turn]: same effect (documented behavior).
 *
 * [Your Turn] When an effect plays one of your Digimon: delete 1 opp Lv.5- Digimon;
 * if didn't delete, draw 1 (documented behavior).
 */

function eligiblePurpleDigimonInTrash(game: EffectContext["game"], ownerSeat: Seat): string[] {
  const player = game.player(ownerSeat);
  return player.trash
    .filter((c) => {
      const def = game.definitionOf(c);
      return (
        def.kinds.includes(CardKind.Digimon) &&
        def.colors.includes(CardColor.Purple)
      );
    })
    .map((c) => c.instanceId);
}

async function trashUpTo3AndPlayFromTrash(
  ctx: EffectContext,
  reduceCostBase: number,
): Promise<void> {
  const ownerSeat = ctx.source.ownerSeat;
  const owner = ctx.game.player(ownerSeat);

  // Trash up to 3 cards from hand
  let trashedCount = 0;
  if (owner.hand.length >= 1) {
    const maxDiscard = Math.min(3, owner.hand.length);
    const handIds = owner.hand.map((c) => c.instanceId);
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: handIds,
      min: 0,
      max: maxDiscard,
    });
    if (chosen.length > 0) {
      await ctx.fx.trash(chosen);
      trashedCount = chosen.length;
    }
  }

  // Dynamic cost reduction: 3 + number of cards trashed
  const reduceCost = reduceCostBase + trashedCount;

  // Play 1 purple Digimon from trash with cost reduced
  const eligibleTrash = eligiblePurpleDigimonInTrash(ctx.game, ownerSeat);
  if (eligibleTrash.length === 0) return;

  // Register temporary play-cost reduction for this effect's single play
  // We use changePlayCost with a filter that matches only the chosen card
  ctx.fx.changePlayCost(
    ({ def, controllerSeat }) =>
      controllerSeat === ownerSeat &&
      def.kinds.includes(CardKind.Digimon) &&
      def.colors.includes(CardColor.Purple),
    -reduceCost,
  );

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: eligibleTrash,
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) return;

  await ctx.fx.playInstances(chosen, { payCost: true });
}

/** Opponent battle-area Digimon permanents at level 5 or lower (the documented behavior CanSelectPermanentCondition). */
function oppLv5OrLowerDigimonIds(ctx: EffectContext): string[] {
  const oppSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
  const opp = ctx.game.player(oppSeat);
  return opp.battleArea
    .filter((p) => {
      if (p.topCard === undefined || p.inBreeding) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return def.kinds.includes(CardKind.Digimon) && def.level !== undefined && def.level <= 5;
    })
    .map((p) => p.permanentId);
}

/**
 * The [Your Turn] payoff: delete 1 of the opponent's level-5-or-lower Digimon; if no deletion
 * happened (no valid target, or an immune/prevented one), draw 1.
 */
async function deleteOppLv5OrLowerOrDraw(ctx: EffectContext): Promise<void> {
  const eligibleDelete = oppLv5OrLowerDigimonIds(ctx);
  if (eligibleDelete.length > 0) {
    const chosen = await ctx.ask.chooseTargets(ctx, { candidates: eligibleDelete, min: 1, max: 1 });
    if (chosen.length > 0) {
      const deleted = await ctx.fx.deletePermanent(chosen, "byEffect");
      ctx.lastDeleteCount = deleted;
      if (deleted === 0) await ctx.fx.draw(ctx.source.ownerSeat, 1);
      return;
    }
  }
  await ctx.fx.draw(ctx.source.ownerSeat, 1);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] [Once Per Turn]
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-trash-play-from-trash`,
          description:
            "[When Digivolving] [Once Per Turn] Trash up to 3 cards from your hand. " +
            "Then play 1 purple Digimon from your trash with the play cost reduced by 3. " +
            "For each card trashed by this effect, further reduce it by 1.",
          maxPerTurn: 1,
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => {
            const owner = ctx.game.player(ctx.source.ownerSeat);
            return owner.hand.length >= 1 || eligiblePurpleDigimonInTrash(ctx.game, ctx.source.ownerSeat).length >= 1;
          },
          resolve: async (ctx) => {
            await trashUpTo3AndPlayFromTrash(ctx, 3);
          },
        }),
      ];
    }

    // [Main] [Once Per Turn]
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-trash-play-from-trash`,
          description:
            "[Main] [Once Per Turn] Trash up to 3 cards from your hand. " +
            "Then play 1 purple Digimon from your trash with the play cost reduced by 3. " +
            "For each card trashed by this effect, further reduce it by 1.",
          maxPerTurn: 1,
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => {
            const owner = ctx.game.player(ctx.source.ownerSeat);
            return owner.hand.length >= 1 || eligiblePurpleDigimonInTrash(ctx.game, ctx.source.ownerSeat).length >= 1;
          },
          resolve: async (ctx) => {
            await trashUpTo3AndPlayFromTrash(ctx, 3);
          },
        }),
      ];
    }

    // [Your Turn] When an EFFECT plays one of your Digimon: delete 1 opp Lv.5- Digimon, else draw 1.
    // Modeled as a whenPlayed SubTrigger watcher (NOT an OnEnterFieldAnyone timing): the play verb
    // `playInstances` fires whenPlayed marked `playedByEffect` (Q3665 — even when THIS card's own
    // effect makes the play), while a manual hand play leaves it unset and a digivolve never fires
    // whenPlayed. The watcher is installed continuously while this Digimon is on the battle area.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/effect-play-delete-or-draw-watcher`,
          description:
            "[Your Turn] When an effect plays one of your Digimon, delete 1 of your opponent's " +
            "level 5 or lower Digimon. If this effect didn't delete, draw 1.",
          isInherited: false,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId} effect-play delete-or-draw`,
              matches: (subCtx) => {
                // Effect-driven play (IsByEffect), on my turn, of one of MY Digimon.
                if (subCtx.trigger?.playedByEffect !== true) return false;
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject?.topCard === undefined) return false;
                if (subject.controllerSeat !== subCtx.source.ownerSeat) return false;
                return subCtx.game.definitionOf(subject.topCard).kinds.includes(CardKind.Digimon);
              },
              run: async (subCtx) => {
                await deleteOppLv5OrLowerOrDraw(subCtx);
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
