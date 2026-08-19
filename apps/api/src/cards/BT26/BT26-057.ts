import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, activated, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-057 — Bearcatmon // Penetrate Blow (BT26 Black/Red DUAL Digimon/Option).
//
// The committed KB contains Q7060-Q7066 (2026-08-18), confirming that effect immunity
// suppresses triggered effects at trigger time while still allowing selection and granting.
//
// [Digivolve] Lv.4 w/[Glowing Dawn] trait: Cost 3 — a digivolution-cost requirement, not an
//   effect clause; already carried by CardDefinition.evoCosts, not implemented here.
// [When Digivolving] By trashing the bottom face-down card under card from under any of
//   your Tamers, until your opponent's turn ends, their Digimon effects don't affect this
//   Digimon, and it gets +3000 DP.
//   Read "card under card" as an OCR duplication of the printed "the bottom face-down card
//   from under any of your Tamers" idiom (identical wording, same cost, on BT26-031/BT26-044
//   in this same set), reusing that shape: `tamersWithFaceDownBottom` /
//   `payByTrashingBottomFaceDownUnderTamer` scan each of the controller's Tamer permanents'
//   stack[0] (bottom, per `Permanent.stack`'s documented bottom..top order) for a face-down
//   card and pay by `trashDigivolutionCards`. "Their Digimon effects don't affect this
//   Digimon" is EX5-074/EX9-021's `restrict(..., "beAffected", ..., { fromSourceKind:
//   ["Digimon"] })` idiom, applied once here (not re-derived continuously, since this is a
//   triggered one-shot grant, not an `[All Turns]` static) for `UntilOpponentTurnEnd`. The
//   "By ~ing, ..." cost-effect construct is optional (an unpaid cost skips the effect),
//   matching BT26-031/BT26-044's `ask.optional` gate before paying.
// [All Turns] [Once Per Turn] When attack targets change or effects trash cards from under
//   your Tamers, this Digimon may unsuspend.
//   "Attack targets change" is any `whenAttackTargetSwitched` firing (currently only raised
//   by `ctx.fx.redirectAttack`, BT11-008/BT16-061 precedent), unqualified by which Digimon is
//   attacking — unlike BT16-061's own-attack-only gate, this card's printed text carries no
//   "this Digimon's attack" qualifier, so no `matches` filter is applied to that subscription.
//   "Effects trash cards from under your Tamers" reuses BT26-044's `whenDigivolutionTrashed`
//   subject-is-a-Tamer-you-control gate (confirmed live by the engine's own
//   `subTriggerSeams.test.ts` "under-Tamer trash reaction" case). `maxPerTurn: 1` is the
//   codebase's existing best-effort convention for a subTrigger-driven "[Once Per Turn]"
//   reaction (BT13-008, EX7-005, BT26-044) — the current subTrigger dispatch path does not
//   itself consult `maxPerTurn`, a pre-existing engine gap this port does not attempt to fix.
//
// Option side [Penetrate Blow]:
// ＜Use Req. ([GlowingDawn] trait)＞ — data-only: satisfied by the hand-authored
//   `optionColorRequirements` field on the card record (["Black"] in cards.json), not an
//   executable action (see BT26-031/BT26-050/BT26-033/BT26-056 precedent and commit
//   1298f75fa). Note the printed requirement names a TRAIT while `optionColorRequirements`
//   encodes a COLOR gate — pre-existing data-authoring convention for this DUAL-card field,
//   not something this module resolves.
// [Main] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. Then, give 1 of your opponent's
//   Digimon "[Start of Your Main Phase] This Digimon attacks." until their turn ends.
//   De-Digivolve reuses `ctx.fx.deDigivolve` directly (BT26-056 precedent: `deDigivolve(id,
//   n, { byEffectSeat: source.ownerSeat })`), a wholly separate target pick from the grant
//   half (no "that Digimon" tying them together, so they may land on the same or different
//   permanents; no "if you did" either, so the grant is attempted regardless of whether the
//   de-digivolve resolved). The grant mirrors the engine's own CAP-C-16 `GainTriggeredEffect`
//   IR action (BT21-077: "gains '[Start of Your Main Phase] This Digimon attacks.'") built
//   from primitives available to a hand-written card: `subscribeSubTrigger` on
//   `"startOfYourMainPhase"` anchored to the granted (opponent's) permanent, gated to that
//   permanent's own controller's main phase (`isOwnersTurn() && isOnBattleArea()`, mirroring
//   the interpreter's `ownerMainPhaseGate`), `expiresOnTurnEndOf` the granted permanent's
//   controller (i.e. the opponent, matching "until their turn ends"), firing
//   `ctx.fx.forceAttack` on each trigger.

const cardId = "BT26-057";

/** Any of `ownerSeat`'s Tamer permanents with a face-down card at the bottom of its stack. */
function tamersWithFaceDownBottom(ctx: EffectContext, ownerSeat: Seat): Permanent[] {
  const owner = ctx.game.player(ownerSeat);
  return Array.from(owner.battleArea).filter((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    if (!ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Tamer)) return false;
    const bottom = p.stack[0];
    return bottom !== undefined && !bottom.faceUp;
  });
}

/**
 * "By trashing the bottom face-down card from under any of your Tamers." Returns whether
 * the cost was actually paid.
 */
async function payByTrashingBottomFaceDownUnderTamer(ctx: EffectContext, ownerSeat: Seat): Promise<boolean> {
  const candidates = tamersWithFaceDownBottom(ctx, ownerSeat);
  if (candidates.length === 0) return false;

  let chosenTamer: Permanent;
  if (candidates.length === 1) {
    chosenTamer = candidates[0]!;
  } else {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: candidates.map((p) => p.permanentId),
      min: 1,
      max: 1,
    });
    if (chosen.length === 0) return false;
    chosenTamer = ctx.game.permanentById(chosen[0]!)!;
  }

  const bottomCard = chosenTamer.stack[0];
  if (bottomCard === undefined) return false;

  await ctx.fx.trashDigivolutionCards(chosenTamer.permanentId, [bottomCard.instanceId]);
  return true;
}

/** Opponent's battle-area Digimon permanents (not in breeding). */
function opponentDigimonTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return Array.from(opponent.battleArea).filter(
    (p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

/** "This Digimon may unsuspend." A no-op when the host isn't currently suspended. */
async function mayUnsuspendSelf(ctx: EffectContext, hostId: string): Promise<void> {
  const host = ctx.game.permanentById(hostId);
  if (host === undefined || host.inBreeding || !host.isSuspended) return;

  const wantTo = await ctx.ask.optional(ctx, "Unsuspend this Digimon?");
  if (!wantTo) return;

  await ctx.fx.unsuspend([hostId]);
}

function isControlledTamer(ctx: EffectContext, permanentId: string | undefined, ownerSeat: Seat): boolean {
  if (permanentId === undefined) return false;
  const subject = ctx.game.permanentById(permanentId);
  if (subject === undefined || subject.topCard === undefined) return false;
  if (subject.controllerSeat !== ownerSeat) return false;
  return ctx.game.definitionOf(subject.topCard).kinds.includes(CardKind.Tamer);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-immune-plus-dp`,
          description:
            "[When Digivolving] By trashing the bottom face-down card from under any of " +
            "your Tamers, until your opponent's turn ends, their Digimon effects don't " +
            "affect this Digimon, and it gets +3000 DP.",
          canActivate: (ctx) => tamersWithFaceDownBottom(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;

            const wantToPay = await ctx.ask.optional(
              ctx,
              "Trash the bottom face-down card from under one of your Tamers, so until " +
                "your opponent's turn ends their Digimon effects don't affect this Digimon " +
                "and it gets +3000 DP?",
            );
            if (!wantToPay) return;

            const paid = await payByTrashingBottomFaceDownUnderTamer(ctx, source.ownerSeat);
            if (!paid) return;

            ctx.fx.restrict(self.permanentId, "beAffected", EffectDuration.UntilOpponentTurnEnd, {
              fromSourceKind: ["Digimon"],
            });
            ctx.fx.modifyDP(self.permanentId, 3000, EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/attack-switch-or-tamer-trash-may-unsuspend`,
          description:
            "[All Turns] [Once Per Turn] When attack targets change or effects trash " +
            "cards from under your Tamers, this Digimon may unsuspend.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const hostId = self.permanentId;

            ctx.fx.subscribeSubTrigger({
              event: "whenAttackTargetSwitched",
              sourcePermanentId: hostId,
              once: false,
              oncePerTurnKey: `${cardId}/attack-switch-or-tamer-trash-may-unsuspend`,
              description: `${cardId}: attack targets change -> may unsuspend.`,
              run: async (subCtx) => {
                await mayUnsuspendSelf(subCtx, hostId);
              },
            });

            ctx.fx.subscribeSubTrigger({
              event: "whenDigivolutionTrashed",
              sourcePermanentId: hostId,
              once: false,
              oncePerTurnKey: `${cardId}/attack-switch-or-tamer-trash-may-unsuspend`,
              description: `${cardId}: effect trashes cards under your Tamer -> may unsuspend.`,
              matches: (subCtx) => isControlledTamer(subCtx, subCtx.trigger?.subjectPermanentId, source.ownerSeat),
              run: async (subCtx) => {
                await mayUnsuspendSelf(subCtx, hostId);
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] ″De-Digivolve 1″ 1 of your opponent's Digimon. Then, give 1 " +
            'of your opponent\'s Digimon "[Start of Your Main Phase] This Digimon attacks." ' +
            "until their turn ends.",
          canActivate: (ctx) => opponentDigimonTargets(ctx, source).length > 0,
          resolve: async (ctx) => {
            const deDigivolveCandidates = opponentDigimonTargets(ctx, source).map((p) => p.permanentId);
            if (deDigivolveCandidates.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: deDigivolveCandidates,
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                ctx.fx.deDigivolve(chosen[0]!, 1, { byEffectSeat: source.ownerSeat });
              }
            }

            const grantCandidates = opponentDigimonTargets(ctx, source).map((p) => p.permanentId);
            if (grantCandidates.length === 0) return;

            const grantChosen = await ctx.ask.chooseTargets(ctx, {
              candidates: grantCandidates,
              min: 1,
              max: 1,
            });
            if (grantChosen.length === 0) return;

            const targetId = grantChosen[0]!;
            const target = ctx.game.permanentById(targetId);
            if (target === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "startOfYourMainPhase",
              sourcePermanentId: targetId,
              once: false,
              expiresOnTurnEndOf: target.controllerSeat,
              matches: (subCtx) => subCtx.source.isOwnersTurn() && subCtx.source.isOnBattleArea(),
              description:
                `${cardId}: grants "[Start of Your Main Phase] This Digimon attacks." until ` +
                "the opponent's turn ends.",
              run: async (subCtx) => {
                await subCtx.fx.forceAttack(targetId);
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
