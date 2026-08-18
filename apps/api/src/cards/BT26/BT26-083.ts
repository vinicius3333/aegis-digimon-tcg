import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-083 — Junomon: Hysteric Mode (BT26, Purple/Yellow Lv.7 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-083` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [Digivolve] Lv.6 w/[TS] trait: Cost 4
 *   [Assembly -4] [Junomon]
 *   ＜Rush＞
 *   ＜Piercing＞
 *   ＜Execute＞
 *   ＜Decode ([Junomon]/Lv.5 or lower w/[Iliad] trait)＞
 *   [On Play] [When Digivolving] Trash all of your security cards. For each card this
 *     effect trashed, delete 1 of your opponent's Digimon. Then, ＜Recovery +3＞ (Place
 *     the top 3 cards of your deck as your top security card.)
 *   [On Deletion] Give all of your opponent's Digimon ＜Security A. -1＞ until their
 *     turn ends.
 *
 * Clause mapping:
 *   EffectTiming.None — ＜Rush＞/＜Piercing＞/＜Execute＞ static grants (`hasKeyword` on the
 *     continuous ledger, not the printed-text scan, is what combat legality actually
 *     reads — BT5-085/BT12-063 precedent). ＜Decode (...)＞ needs no grant: the Decode
 *     keyword mechanic has no gameplay implementation anywhere in this engine yet (only
 *     cosmetic keyword-name detection in `combat/keywords.ts`) — the same
 *     non-implementation as every other Decode-carrying card in the corpus.
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving — "Trash all of your security
 *     cards. For each card this effect trashed, delete 1 of your opponent's Digimon.
 *     Then, <Recovery +3>." `ctx.fx.trashFromSecurity(seat, count, { fromTop: true })`
 *     for the whole stack, then up to that many `deletePermanent` targets chosen among
 *     the opponent's Digimon, then `ctx.fx.recoverToSecurity(seat, 3)`.
 *   EffectTiming.OnDestroyedAnyone — "Give all of your opponent's Digimon <Security A.
 *     -1> until their turn ends." A group grant (RB1-019/BT26-089 `grantKeyword(...,
 *     "SecurityAttack", EffectDuration.UntilOpponentTurnEnd, -1)` precedent), applied to
 *     every opponent Digimon rather than a single chosen one.
 */
const cardId = "BT26-083";

/** "Trash all of your security cards. For each card this effect trashed, delete 1 of your opponent's Digimon. Then, <Recovery +3>." */
async function resolveSecurityWipeDelete(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const securityCount = owner.security.length;
  if (securityCount > 0) {
    const trashed = await ctx.fx.trashFromSecurity(source.ownerSeat, securityCount, { fromTop: true });

    const opponent = ctx.game.opponentOf(source.ownerSeat);
    for (let i = 0; i < trashed.length; i++) {
      const candidates = ctx.game
        .player(opponent)
        .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
        .map((p) => p.permanentId);
      if (candidates.length === 0) break;
      const chosen =
        candidates.length === 1
          ? candidates[0]!
          : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
      if (chosen === undefined) break;
      await ctx.fx.deletePermanent([chosen]);
    }
  }

  await ctx.fx.recoverToSecurity(source.ownerSeat, 3);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/rush`,
          description: "＜Rush＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Rush", EffectDuration.UntilEachTurnEnd);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/piercing`,
          description: "＜Piercing＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Piercing", EffectDuration.UntilEachTurnEnd);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/execute`,
          description: "＜Execute＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Execute", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-security-wipe`,
          description:
            "[On Play] [When Digivolving] Trash all of your security cards. For each card " +
            "this effect trashed, delete 1 of your opponent's Digimon. Then, ＜Recovery +3＞ " +
            "(Place the top 3 cards of your deck as your top security card.)",
          optional: false,
          resolve: async (ctx) => resolveSecurityWipeDelete(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-security-wipe`,
          description:
            "[On Play] [When Digivolving] Trash all of your security cards. For each card " +
            "this effect trashed, delete 1 of your opponent's Digimon. Then, ＜Recovery +3＞ " +
            "(Place the top 3 cards of your deck as your top security card.)",
          optional: false,
          resolve: async (ctx) => resolveSecurityWipeDelete(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-security-attack-debuff`,
          description: "[On Deletion] Give all of your opponent's Digimon ＜Security A. -1＞ until their turn ends.",
          optional: false,
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            for (const permanent of ctx.game.player(opponent).battleArea) {
              if (permanent.topCard === undefined || !isDigimon(ctx.game.definitionOf(permanent.topCard))) continue;
              ctx.fx.grantKeyword(permanent.permanentId, "SecurityAttack", EffectDuration.UntilOpponentTurnEnd, -1);
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
