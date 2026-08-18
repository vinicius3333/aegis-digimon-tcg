import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-069 — Dobermon (BT26, Purple Lv.4 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-069 as of this port
// (`node tools/kb/query.mjs card BT26-069` returned no knowledge-base entries — BT26 has
// no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// Printed text:
//   [Digivolve] Lv.3 w/[TS] trait: Cost 2 — a digivolution-cost requirement, not an
//     effect clause; already carried by CardDefinition.evoCosts in cards.json, so it
//     needs no entry here.
//   When this card is trashed from the hand, if your hand has 5 or fewer cards,
//     ＜Draw 1＞.
//   [On Play] [When Digivolving] By trashing 1 card in your hand, delete 1 level 4 or
//     lower Digimon.
//   Inherited: [Your Turn] [Once Per Turn] When your hand is trashed from, this [Titan]
//     trait Digimon may digivolve into [Titamon] or a [Titan] trait Digimon card in the
//     trash with the cost reduced by 1.
//
// Clause mapping:
//   "When this card is trashed from the hand..." is UNIMPLEMENTED — confirmed missing
//   primitive, not a card-design choice. A hand-resident self-reactive watcher has to be
//   installed via `ctx.fx.subscribeSubTrigger({ event: "whenTrashedFromHand", ... })`
//   while the card sits in hand (no permanent exists yet), so the install carries no
//   `sourcePermanentId`. But `GameEngine.fireSubTrigger`'s `makeContext` (GameEngine.ts
//   ~1340-1352) ALWAYS returns `undefined` when `sub.sourcePermanentId` is undefined
//   (`srcPerm` becomes `undefined`, so `srcPerm?.topCard === undefined` is vacuously
//   true), and `SubTriggerRegistry.fire` only runs a sub with `ctx === undefined`
//   directly when it ALSO has no `matches` predicate — which this clause needs (to gate
//   on its own card id). Verified empirically: registering BT24-013 (the only other
//   printed card with this exact "trashed from hand -> draw" shape, IR-compiled) in a
//   player's hand and trashing it via the `trash` primitive does not draw a card (deck
//   count unchanged). Writing a `subscribeSubTrigger` call for this clause would be dead
//   code that can never fire — no fake pass. Reported as the missing primitive: an
//   anchor-less `SubTriggerInstall` needs a delivery path that does not require a live
//   permanent (e.g. binding `ctx.source` from the loose `CardInstance` itself).
//
//   EffectTiming.OnPlay / EffectTiming.WhenDigivolving (shared body) — "By trashing 1
//     card in your hand, delete 1 level 4 or lower Digimon." No "opponent's" qualifier in
//     the printed text (unlike BT26-013's near-identical shape), so the delete target
//     pool spans BOTH players' battle areas, filtered by printed level rather than DP.
//     Modeled on BT26-013's `resolveTrashToDelete` (optional cost via `ctx.ask.selectCards`
//     with min:0, then `ctx.fx.trash`, then `ctx.fx.deletePermanent`).
//
//   EffectTiming.None (staticModifier, `isInherited: true`) — the inherited "[Your Turn]
//     [Once Per Turn] When your hand is trashed from, this [Titan] trait Digimon may
//     digivolve into [Titamon] or a [Titan] trait Digimon card in the trash with the cost
//     reduced by 1." This IS deliverable: unlike the hand-resident clause above, the
//     watcher's source card sits in a digivolution stack UNDER a live permanent, so
//     `subscribeSubTrigger` is anchored on that permanent's `permanentId` — the exact
//     shape BT26-059's "[All Turns] [Once Per Turn] When hands are trashed from..."
//     clause already uses successfully. `maxPerTurn: 1` on the None-timing host is
//     documentation only — GameEngine.ts's `EffectTiming.None` comment says it isn't
//     counted — so the printed "Once Per Turn" is enforced instead via the watcher's own
//     `oncePerTurnKey` (a stable per-turn ledger key, independent of the subscription id
//     the continuous recompute reassigns).

const cardId = "BT26-069";
const TITAN_TRAIT = "Titan";

/**
 * "By trashing 1 card in your hand, delete 1 level 4 or lower Digimon." Shared by the
 * [On Play] and [When Digivolving] clauses. No controller restriction in the printed
 * text — the target pool spans both players' battle-area Digimon.
 */
async function resolveTrashToDeleteLevel4OrLower(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  if (owner.hand.length === 0) return;

  const toTrash = await ctx.ask.selectCards(ctx, { candidates: owner.hand.map((c) => c.instanceId), min: 0, max: 1 });
  if (toTrash.length === 0) return;
  await ctx.fx.trash(toTrash);

  const candidates: string[] = [];
  for (const player of ctx.game.state.players) {
    if (player === undefined) continue;
    for (const perm of player.battleArea) {
      if (perm.topCard === undefined) continue;
      const def = ctx.game.definitionOf(perm.topCard);
      if (isDigimon(def) && (def.level ?? Number.POSITIVE_INFINITY) <= 4) {
        candidates.push(perm.permanentId);
      }
    }
  }
  if (candidates.length === 0) return;

  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (chosen.length === 0) return;
  await ctx.fx.deletePermanent(chosen, "byEffect");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] By trashing 1 card in your hand, delete 1 level 4 or lower Digimon.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/trash-hand-delete-lv4-or-lower`,
          description:
            "[On Play] [When Digivolving] By trashing 1 card in your hand, delete 1 level 4 or lower Digimon.",
          optional: false,
          resolve: async (ctx) => {
            await resolveTrashToDeleteLevel4OrLower(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] Same clause.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/trash-hand-delete-lv4-or-lower`,
          description:
            "[On Play] [When Digivolving] By trashing 1 card in your hand, delete 1 level 4 or lower Digimon.",
          optional: false,
          resolve: async (ctx) => {
            await resolveTrashToDeleteLevel4OrLower(ctx, source);
          },
        }),
      ];
    }

    // Inherited: [Your Turn] [Once Per Turn] When your hand is trashed from, this
    // [Titan] trait Digimon may digivolve into [Titamon] or a [Titan] trait Digimon
    // card in the trash with the cost reduced by 1.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-hand-trashed-digivolve-titan`,
          description:
            "[Your Turn] [Once Per Turn] When your hand is trashed from, this [Titan] trait " +
            "Digimon may digivolve into [Titamon] or a [Titan] trait Digimon card in the " +
            "trash with the cost reduced by 1.",
          isInherited: true,
          maxPerTurn: 1, // documents the intent; enforced via the watcher's oncePerTurnKey below.
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            const hostPermanentId = host.permanentId;

            ctx.fx.subscribeSubTrigger({
              event: "whenHandTrashed",
              sourcePermanentId: hostPermanentId,
              once: false,
              oncePerTurnKey: `${cardId}/inherited-hand-trashed-digivolve-titan`,
              description: `${cardId}: when your hand is trashed from, may digivolve into Titamon/[Titan] from trash.`,
              matches: (subCtx) => subCtx.trigger?.handTrashedSeat === source.ownerSeat,
              run: async (subCtx) => {
                if (!source.isOwnersTurn()) return; // [Your Turn]

                const owner = subCtx.game.player(source.ownerSeat);
                const candidates = owner.trash.filter((c) => {
                  const def = subCtx.game.definitionOf(c);
                  return isDigimon(def) && (def.nameEn === "Titamon" || (def.types ?? []).includes(TITAN_TRAIT));
                });
                if (candidates.length === 0) return;

                const willDigivolve = await subCtx.ask.optional(
                  subCtx,
                  "Digivolve into [Titamon] or a [Titan] trait Digimon card in the trash, cost reduced by 1?",
                );
                if (!willDigivolve) return;

                let chosenId: string;
                if (candidates.length === 1) {
                  chosenId = candidates[0]!.instanceId;
                } else {
                  const chosen = await subCtx.ask.selectCards(subCtx, {
                    candidates: candidates.map((c) => c.instanceId),
                    min: 1,
                    max: 1,
                  });
                  if (chosen.length === 0) return;
                  chosenId = chosen[0]!;
                }

                await subCtx.fx.digivolveFromInstance(hostPermanentId, chosenId, {
                  payCost: true,
                  costDelta: -1,
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
