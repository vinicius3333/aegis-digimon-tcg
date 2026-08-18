import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security, inTrash } from "../../engine/effects/builders.js";
import { requireOpponentAsk } from "../../engine/decisions/decisionApi.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX7-072 — Seventh Fascination (EX7, Purple Option).
 *
 * Printed text (cards.json EX7-072):
 *   [Trash] [Your Turn] When your Digimon digivolves into [Lilithmon (X Antibody)], by
 *     returning this card to the bottom of the deck, activate this card's [Main] effect.
 *   [Main] All your opponent's Digimon gain "[End of Your Turn] Delete 1 of your Digimon."
 *     until end of their turn.
 *   [Security] Delete 1 of your opponent's unsuspended Digimon.
 *
 * KB rulings (binding):
 *   Q3871: the granted "[End of Your Turn] Delete 1 of your Digimon" can be given to a
 *     Digimon immune to effects; it simply won't trigger for that Digimon.
 *   Q3872: the granted delete is attributed to the AFFECTED Digimon's own controller (not
 *     this card's controller) for purposes of other triggers (e.g. ＜Partition＞ does not
 *     fire) — consistent with the delete being the opponent's own choice below.
 *   Q5728/Q5729: [Trash] effects only trigger/activate while resident in the trash; if
 *     multiple such effects would fire alongside the digivolution's own triggers, the
 *     player chooses the order.
 *
 * [Main] (EffectTiming.OnUseOption): for each of the opponent's battle-area Digimon
 *   present at resolution, grant a one-shot "[End of Your Turn] Delete 1 of your Digimon"
 *   reaction expiring at the end of the opponent's turn — one independent grant per
 *   Digimon (EX6-070 precedent: subscribeSubTrigger("endOfOpponentTurn", ...)). The delete
 *   choice belongs to the opponent (Q3872 — it is THEIR effect), so it is asked via
 *   `requireOpponentAsk`.
 *
 * [Trash] [Your Turn] (EffectTiming.None, `inTrash` builder): this card has no permanent
 *   to anchor to while resident in the trash, so the reactive watcher is installed with the
 *   anchor-less `sourceInstanceId` fallback (BT26-078 precedent) on "whenOneOfYoursDigivolves",
 *   filtered to a digivolve into [Lilithmon (X Antibody)] on one of the OWNER's Digimon. The
 *   cost ("by returning this card to the bottom of the deck") gates directly invoking the
 *   [Main] body inline (this is a triggered activation, not a normal OnUseOption play).
 */
const cardId = "EX7-072";

const LILITHMON_X_ANTIBODY = "Lilithmon (X Antibody)";

function opponentDigimonPermanentIds(ctx: EffectContext, ownerSeat: 0 | 1): string[] {
  const opponentSeat = ctx.game.opponentOf(ownerSeat);
  const opponent = ctx.game.player(opponentSeat);
  return Array.from(opponent.battleArea)
    .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
}

/**
 * [Main] All your opponent's Digimon gain "[End of Your Turn] Delete 1 of your Digimon."
 * until end of their turn.
 */
async function resolveMainEffect(ctx: EffectContext, source: CardSource): Promise<void> {
  const ownerSeat = source.ownerSeat as 0 | 1;
  const opponentSeat = ctx.game.opponentOf(ownerSeat);
  const grantedIds = opponentDigimonPermanentIds(ctx, ownerSeat);

  for (const permanentId of grantedIds) {
    ctx.fx.subscribeSubTrigger({
      event: "endOfOpponentTurn",
      sourcePermanentId: permanentId,
      once: true,
      expiresOnTurnEndOf: opponentSeat,
      description:
        `${cardId} [Main]: granted "[End of Your Turn] Delete 1 of your Digimon" until ` +
        "end of the opponent's turn.",
      matches: (subCtx) => {
        const perm = subCtx.game.permanentById(permanentId);
        return perm !== undefined && perm.controllerSeat === opponentSeat;
      },
      run: async (subCtx) => {
        const opponent = subCtx.game.player(opponentSeat);
        const candidates = Array.from(opponent.battleArea)
          .filter((p) => p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard)))
          .map((p) => p.permanentId);
        if (candidates.length === 0) return;

        // Q3872: the granted effect belongs to the affected Digimon's controller (the
        // opponent) — the delete choice is theirs, not this card's owner's.
        const chosen = await requireOpponentAsk(subCtx).chooseTargets(subCtx, {
          candidates,
          min: 1,
          max: 1,
        });
        if (chosen.length > 0) {
          await subCtx.fx.deletePermanent(chosen);
        }
      },
    });
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] All your opponent's Digimon gain "[End of Your Turn] Delete 1 of your
    // Digimon." until end of their turn.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-grant-end-of-turn-delete`,
          description:
            "[Main] All your opponent's Digimon gain \"[End of Your Turn] Delete 1 of " +
            "your Digimon.\" until end of their turn.",
          optional: false,
          resolve: async (ctx) => resolveMainEffect(ctx, source),
        }),
      ];
    }

    // [Trash] [Your Turn] When your Digimon digivolves into [Lilithmon (X Antibody)], by
    // returning this card to the bottom of the deck, activate this card's [Main] effect.
    if (timing === EffectTiming.None) {
      return [
        inTrash({
          source,
          effectKey: `${cardId}/trash-your-turn-digivolve-into-lilithmon-xa`,
          description:
            "[Trash] [Your Turn] When your Digimon digivolves into [Lilithmon (X Antibody)], " +
            "by returning this card to the bottom of the deck, activate this card's [Main] " +
            "effect.",
          when: (ctx) => ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat as 0 | 1;
            ctx.fx.subscribeSubTrigger({
              event: "whenOneOfYoursDigivolves",
              sourceInstanceId: ctx.source.instanceId,
              once: false,
              description:
                `${cardId}: [Trash][Your Turn] a Digimon digivolves into ` +
                `[${LILITHMON_X_ANTIBODY}] -> optionally activate [Main].`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.controllerSeat !== ownerSeat) return false;
                if (subject.topCard === undefined) return false;
                return subCtx.game.definitionOf(subject.topCard).nameEn === LILITHMON_X_ANTIBODY;
              },
              run: async (subCtx) => {
                const willActivate = await subCtx.ask.optional(
                  subCtx,
                  "By returning this card to the bottom of the deck, activate this card's " +
                    "[Main] effect?",
                );
                if (!willActivate) return;

                await subCtx.fx.returnToDeck([subCtx.source.instanceId]);
                await resolveMainEffect(subCtx, source);
              },
            });
          },
        }),
      ];
    }

    // [Security] Delete 1 of your opponent's unsuspended Digimon.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-delete-unsuspended`,
          description: "[Security] Delete 1 of your opponent's unsuspended Digimon.",
          resolve: async (ctx: EffectContext) => {
            const opp = ctx.game.opponentOf(source.ownerSeat);
            const candidates = ctx.game
              .player(opp)
              .battleArea.filter(
                (p) =>
                  !p.isSuspended &&
                  p.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(p.topCard)),
              )
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });

            if (chosen.length > 0) {
              await ctx.fx.deletePermanent(chosen, "byEffect");
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
