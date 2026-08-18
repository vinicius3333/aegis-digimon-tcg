import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-044 — Lilamon (BT26, Green Lv.5 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-044 as of this port
// (`node tools/kb/query.mjs card BT26-044` returned no knowledge-base entries — BT26 has
// no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// Printed text:
//   [Digivolve] Lv.4 w/[DATA SQUAD] trait: Cost 3 — a digivolution-cost requirement, not
//     an effect clause; already carried by CardDefinition.evoCosts, not implemented here.
//   [On Play] [When Digivolving] You may suspend 1 of your opponent's Digimon or Tamers.
//     Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends.
//   [Your Turn] [Once Per Turn] When any of your opponent's Digimon or Tamers suspend, or
//     effects trash cards from under your Tamers, this Digimon may digivolve into a
//     [Vegetation], [Fairy] or [DATA SQUAD] trait Digimon card in the hand with the cost
//     reduced by 1.
//   Inherited: [All Turns] [Once Per Turn] When this Digimon with [Rosemon] in its name or
//     the [DATA SQUAD] trait would leave the battle area, by trashing the bottom face-down
//     card from under any of your Tamers, it doesn't leave.
//
// Clause mapping:
//   EffectTiming.OnPlay / EffectTiming.WhenDigivolving (shared body) — "You may suspend 1
//     of your opponent's Digimon or Tamers. Then, 1 of their Digimon or Tamers can't
//     unsuspend until their turn ends." Modeled on BT26-042's mandatory version of this
//     exact shape (Digimon-or-Tamer target pool via `def.kinds.includes(CardKind.Tamer)`,
//     `ctx.fx.suspend`, then `ctx.fx.restrict(id, "unsuspend", EffectDuration.UntilOpponentTurnEnd)`),
//     wrapped in a single `ctx.ask.optional` gate up front for the printed "You may" (both
//     halves are declined together, matching the codebase's "you may X. Then, Y." idiom of
//     asking once before either half resolves — see BT13-075/BT13-086/BT12-081).
//
//   EffectTiming.None, isInherited: false, reactive (staticModifier + subscribeSubTrigger,
//     "[Your Turn]" via `when: source.isOwnersTurn()`) — "When any of your opponent's
//     Digimon or Tamers suspend, or effects trash cards from under your Tamers, this
//     Digimon may digivolve into a [Vegetation]/[Fairy]/[DATA SQUAD] trait Digimon card in
//     the hand with the cost reduced by 1." Modeled on BT13-008's `whenSuspended` reactive
//     idiom (continuous install gated by `isOwnersTurn`, matches on the suspended
//     permanent's controller) plus `whenDigivolutionTrashed`'s "effects trash cards from
//     under your Tamers" coverage (confirmed by the engine's own
//     `subTriggerSeams.test.ts` "under-Tamer trash reaction (ST23-14)" case — a Tamer's
//     stacked cards share the SAME `trashDigivolutionCards` seam a Digimon's digivolution
//     cards use, so no separate event is needed). The digivolve itself mirrors
//     EX12-066/067/068's `digivolveFromInstance(..., { payCost: true, costDelta: -1,
//     ignoreRequirements: true })` — a trait-based alternate digivolve target, not the
//     printed evo chain, so digivolution requirements are waived exactly as those
//     precedents do. `maxPerTurn: 1` is set on the installing effect per the codebase's
//     existing (best-effort) convention for a subTrigger-driven "[Once Per Turn]" reaction
//     (BT13-008, EX7-005) — the current subTrigger dispatch path does not itself consult
//     `maxPerTurn`, a pre-existing engine gap this port does not attempt to fix.
//
//   EffectTiming.None, isInherited: true — "[All Turns] [Once Per Turn] When this Digimon
//     with [Rosemon] in its name or the [DATA SQUAD] trait would leave the battle area, by
//     trashing the bottom face-down card from under any of your Tamers, it doesn't leave."
//     Modeled on BT9-012's inherited `wouldLeavePlay` "prevent" idiom (`isInherited: true`,
//     `protects` reading the host's CURRENT top-card name/trait at consult time,
//     `ask.optional` before paying) and BT26-016's `oncePerTurnKey` for the printed "[Once
//     Per Turn]" cap on a prevention. The paid cost reads any of the controller's Tamer
//     permanents' stack[0] (bottom, per Permanent.stack's documented bottom..below-top
//     order) when it is face-down, and trashes it via `trashDigivolutionCards` — the same
//     seam BT26-098's clause and the engine's ST23-14 test both use for "trashing ... from
//     under a Tamer".

const cardId = "BT26-044";

const ALT_DIGIVOLVE_TRAITS = ["Vegetation", "Fairy", "DATA SQUAD"];

function hasTrait(def: CardDefinition, trait: string): boolean {
  return (def.types ?? []).includes(trait);
}

function isDigimonOrTamer(p: Permanent, ctx: EffectContext): boolean {
  if (p.inBreeding || p.topCard === undefined) return false;
  const def = ctx.game.definitionOf(p.topCard);
  return isDigimon(def) || def.kinds.includes(CardKind.Tamer);
}

/** Battle-area Digimon-or-Tamer permanents (not in breeding) controlled by `seat`. */
function digimonOrTamerTargets(ctx: EffectContext, seat: Seat): Permanent[] {
  return Array.from(ctx.game.player(seat).battleArea).filter((p) => isDigimonOrTamer(p, ctx));
}

async function chooseOne(ctx: EffectContext, candidates: Permanent[]): Promise<string | undefined> {
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0]!.permanentId;
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map((p) => p.permanentId),
    min: 1,
    max: 1,
  });
  return chosen[0];
}

/**
 * "You may suspend 1 of your opponent's Digimon or Tamers. Then, 1 of their Digimon or
 * Tamers can't unsuspend until their turn ends." Shared by [On Play] and [When Digivolving].
 */
async function resolveMaySuspendAndLock(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  if (digimonOrTamerTargets(ctx, opponentSeat).length === 0) return;

  const wantToActivate = await ctx.ask.optional(
    ctx,
    "Suspend 1 of your opponent's Digimon or Tamers, then keep 1 of their Digimon or " +
      "Tamers from unsuspending until their turn ends?",
  );
  if (!wantToActivate) return;

  const suspendTargetId = await chooseOne(ctx, digimonOrTamerTargets(ctx, opponentSeat));
  if (suspendTargetId !== undefined) {
    await ctx.fx.suspend([suspendTargetId]);
  }

  const lockTargetId = await chooseOne(ctx, digimonOrTamerTargets(ctx, opponentSeat));
  if (lockTargetId !== undefined) {
    ctx.fx.restrict(lockTargetId, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
  }
}

function altDigivolveHandCandidates(ctx: EffectContext, ownerSeat: Seat) {
  const owner = ctx.game.player(ownerSeat);
  return Array.from(owner.hand).filter((c) => {
    const def = ctx.game.definitionOf(c);
    return isDigimon(def) && ALT_DIGIVOLVE_TRAITS.some((trait) => hasTrait(def, trait));
  });
}

/**
 * "This Digimon may digivolve into a [Vegetation], [Fairy] or [DATA SQUAD] trait Digimon
 * card in the hand with the cost reduced by 1." Shared by the two reactive triggers below.
 */
async function resolveMayAltDigivolve(ctx: EffectContext, hostId: string, ownerSeat: Seat): Promise<void> {
  const host = ctx.game.permanentById(hostId);
  if (host === undefined || host.inBreeding) return;

  const candidates = altDigivolveHandCandidates(ctx, ownerSeat);
  if (candidates.length === 0) return;

  const wantToActivate = await ctx.ask.optional(
    ctx,
    "Digivolve this Digimon into a [Vegetation], [Fairy] or [DATA SQUAD] trait Digimon " +
      "card in the hand, with the cost reduced by 1?",
  );
  if (!wantToActivate) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) return;

  await ctx.fx.digivolveFromInstance(hostId, chosen[0]!, {
    payCost: true,
    costDelta: -1,
    ignoreRequirements: true,
  });
}

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

function nameOrTraitQualifies(def: CardDefinition): boolean {
  return def.nameEn.includes("Rosemon") || hasTrait(def, "DATA SQUAD");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/may-suspend-and-lock`,
          description:
            "[On Play] [When Digivolving] You may suspend 1 of your opponent's Digimon or " +
            "Tamers. Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends.",
          optional: true,
          canActivate: (ctx) =>
            digimonOrTamerTargets(ctx, ctx.game.opponentOf(source.ownerSeat)).length > 0,
          resolve: async (ctx) => {
            await resolveMaySuspendAndLock(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/may-suspend-and-lock`,
          description:
            "[On Play] [When Digivolving] You may suspend 1 of your opponent's Digimon or " +
            "Tamers. Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends.",
          optional: true,
          canActivate: (ctx) =>
            digimonOrTamerTargets(ctx, ctx.game.opponentOf(source.ownerSeat)).length > 0,
          resolve: async (ctx) => {
            await resolveMaySuspendAndLock(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        // [Your Turn] [Once Per Turn] When any of your opponent's Digimon or Tamers
        // suspend, or effects trash cards from under your Tamers, this Digimon may
        // digivolve into a [Vegetation]/[Fairy]/[DATA SQUAD] trait Digimon card in hand
        // with the cost reduced by 1.
        staticModifier({
          source,
          effectKey: `${cardId}/reactive-alt-digivolve`,
          description:
            "[Your Turn] [Once Per Turn] When any of your opponent's Digimon or Tamers " +
            "suspend, or effects trash cards from under your Tamers, this Digimon may " +
            "digivolve into a [Vegetation], [Fairy] or [DATA SQUAD] trait Digimon card in " +
            "the hand with the cost reduced by 1.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const hostId = self.permanentId;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeSubTrigger({
              event: "whenSuspended",
              sourcePermanentId: hostId,
              once: false,
              oncePerTurnKey: `${cardId}/reactive-alt-digivolve`,
              description: `${cardId}: opponent Digimon/Tamer suspends -> may alt-digivolve.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                const susId = subCtx.trigger?.suspendedPermanentId;
                if (susId === undefined) return false;
                const suspPerm = subCtx.game.permanentById(susId);
                if (suspPerm === undefined || suspPerm.inBreeding || suspPerm.topCard === undefined) return false;
                if (suspPerm.controllerSeat !== subCtx.game.opponentOf(ownerSeat)) return false;
                const def = subCtx.game.definitionOf(suspPerm.topCard);
                return isDigimon(def) || def.kinds.includes(CardKind.Tamer);
              },
              run: async (subCtx) => {
                await resolveMayAltDigivolve(subCtx, hostId, ownerSeat);
              },
            });

            ctx.fx.subscribeSubTrigger({
              event: "whenDigivolutionTrashed",
              sourcePermanentId: hostId,
              once: false,
              oncePerTurnKey: `${cardId}/reactive-alt-digivolve`,
              description: `${cardId}: effect trashes cards under your Tamer -> may alt-digivolve.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== ownerSeat) return false;
                return subCtx.game.definitionOf(subject.topCard).kinds.includes(CardKind.Tamer);
              },
              run: async (subCtx) => {
                await resolveMayAltDigivolve(subCtx, hostId, ownerSeat);
              },
            });
          },
        }),
        // Inherited: [All Turns] [Once Per Turn] When this Digimon with [Rosemon] in its
        // name or the [DATA SQUAD] trait would leave the battle area, by trashing the
        // bottom face-down card from under any of your Tamers, it doesn't leave.
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-prevent-leave`,
          description:
            "[All Turns] (inherited) [Once Per Turn] When this Digimon with [Rosemon] in " +
            "its name or the [DATA SQUAD] trait would leave the battle area, by trashing " +
            "the bottom face-down card from under any of your Tamers, it doesn't leave.",
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            const hostId = host.permanentId;

            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: hostId,
              mode: "prevent",
              oncePerTurnKey: `${cardId}/prevent-leave/${hostId}`,
              description:
                "[All Turns] [Once Per Turn] By trashing the bottom face-down card from " +
                "under any of your Tamers, this Digimon (with [Rosemon] in its name or the " +
                "[DATA SQUAD] trait) doesn't leave the battle area.",
              protects: (subCtx, leavingId) => {
                if (leavingId !== hostId) return false;
                const leaving = subCtx.game.permanentById(leavingId);
                if (leaving === undefined || leaving.topCard === undefined) return false;
                return nameOrTraitQualifies(subCtx.game.definitionOf(leaving.topCard));
              },
              preventCheck: async (subCtx) => {
                if (tamersWithFaceDownBottom(subCtx, source.ownerSeat).length === 0) return false;

                const wantToPay = await subCtx.ask.optional(
                  subCtx,
                  "Trash the bottom face-down card from under one of your Tamers to keep " +
                    "this Digimon from leaving the battle area?",
                );
                if (!wantToPay) return false;

                return payByTrashingBottomFaceDownUnderTamer(subCtx, source.ownerSeat);
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
