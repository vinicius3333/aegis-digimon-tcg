// Continuous prohibitions and immunities.

import type { EffectContext, Restriction } from "../../EffectContext.js";
import { toDuration } from "../duration.js";
import { definitionMatches } from "../matching/definition.js";
import { seatsForController } from "../matching/permanent.js";
import { resolvePermanentTargets } from "../targeting/permanents.js";
import type { Action } from "@aegis/shared";

export async function runRestrictionAction(ctx: EffectContext, action: Action): Promise<boolean> {
  switch (action.kind) {
    case "Restrict": {
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      // Target-scoped prohibition (BT10-042): affected Digimon can't attack THIS source,
      // but may still attack the player or a different Digimon. A plain `attack`
      // restriction would incorrectly suppress the entire declaration.
      if ((action as typeof action & { specificTarget?: string }).specificTarget === "source") {
        const sourcePermanentId = ctx.source.permanent()?.permanentId;
        if (sourcePermanentId !== undefined) {
          for (const id of ids) ctx.fx.restrictAttackTarget(id, sourcePermanentId, duration);
        }
        return false;
      }
      if ((action.restriction as string) === "attackOrBlock") {
        for (const id of ids) {
          ctx.fx.restrict(id, "attack", duration);
          ctx.fx.restrict(id, "block", duration);
        }
        return false;
      }
      // Card IR spells this immunity using the printed-action vocabulary, while the engine's
      // legality layer consumes the normalized `beReturned` restriction for both hand and deck.
      const restriction = (action.restriction === "returnToHandOrDeck"
        ? "beReturned"
        : action.restriction) as Restriction;
      // A deprecated kind has no consumer, so recording it would be a silent no-op. Drop it
      // here instead: `restrict()` no longer accepts one, and the ~32 IR records still
      // carrying `activateEffects` are superseded by the disableSecurityEffect /
      // disableTimingEffect verbs.
      if (restriction === "activateEffects") return false;
      const fromSourceKind = action.fromSourceKind as string[] | undefined;
      const byOpponentEffectsOnly = action.byOpponentEffectsOnly === true ? true : undefined;
      for (const id of ids) ctx.fx.restrict(id, restriction, duration, { fromSourceKind, byOpponentEffectsOnly });
      return false;
    }
    case "RestrictUnsuspendedDigivolve": {
      const seat = action.seat === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
      ctx.fx.restrictUnsuspendedDigivolve(seat, ctx.source.ownerSeat, toDuration(action.duration));
      return false;
    }
    case "RestrictDigivolveInto": {
      // EX10-035: "this Digimon can only digivolve into [Apocalymon]". Record a positive
      // digivolve-target constraint on the resolved target(s) carrying the allowed into-filter;
      // digivolve-legality (validateDigivolve) rejects any other evolving card onto them.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      const into = action.into;
      for (const id of ids) {
        ctx.fx.restrictDigivolveInto?.(id, (def) => definitionMatches(into, def), duration);
      }
      return false;
    }
    case "MinDpFloor": {
      // EX11-070 [All Turns]: "this Digimon can't have less than 1000 DP". A persistent floor on
      // the resolved target(s) (the inherited-effect host), applied in the DP-calc layer AFTER all
      // +/- changes (KB Q5941). Re-derived each continuous pass (CR-01).
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.minDpFloor?.(id, action.floor, duration);
      return false;
    }
    case "StackTrashLock": {
      // EX11-070 [All Turns]: "your opponent's effects can't trash this Digimon's stacked cards"
      // (KB Q5943). A persistent lock on the resolved target(s) (the inherited-effect host),
      // consulted at the digivolution-card trash sites. Re-derived each continuous pass (CR-01).
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.stackTrashLock?.(id, duration);
      return false;
    }
    case "RestrictMemoryGain": {
      const seats = seatsForController(ctx, { controller: action.seat });
      const duration = toDuration(action.duration);
      for (const seat of seats) ctx.fx.restrictMemoryGain(seat, duration);
      return false;
    }
    case "RestrictCostReduction": {
      const seats = seatsForController(ctx, { controller: action.seat });
      const duration = toDuration(action.duration);
      for (const seat of seats) ctx.fx.restrictCostReduction(seat, action.costType, duration);
      return false;
    }
    case "RestrictPlay": {
      // Seat-level "can't play/move <X>" prohibition. The restricted seat is the source's
      // opponent (action.seat === "opponent"); resolve it via the same seat-scoping helper.
      // The IR Filter narrows to a serializable PlayMatch (kind + DP cap) — the only forms the
      // source CardCondition uses (IsOption / IsDigimon + CardDP <= N).
      const seats = seatsForController(ctx, { controller: action.seat });
      const duration = toDuration(action.duration);
      const match = {
        ...(action.filter.kind ? { kinds: action.filter.kind } : {}),
        ...(action.filter.dpAtMost !== undefined ? { dpAtMost: action.filter.dpAtMost } : {}),
      };
      for (const seat of seats)
        ctx.fx.restrictPlay(seat, ctx.source.ownerSeat, match, action.mode, duration, action.byEffectOnly);
      return false;
    }
    case "GlobalRestrict": {
      if (action.restriction === "opponentCannotAddToSecurity") {
        ctx.fx.restrictSecurityAddsFromEffect?.(
          ctx.game.opponentOf(ctx.source.ownerSeat),
          ctx.source.ownerSeat,
          toDuration(action.duration),
        );
      }
      return false;
    }
    case "GrantImmunity": {
      // "not affected by opponent's effects while condition holds" (CAP-C-06, BT19-101).
      // Stored as an unconditional beAffected restriction; the condition gate on the
      // containing effect already prevents this from firing when the condition is false.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.restrict(id, "beAffected", duration);
      return false;
    }
    case "ArmSuspendRestriction": {
      // BT23-024: arm the suspend-restriction-with-superlative-exception on THIS source for the
      // stated duration ("until their turn ends" => UntilOpponentTurnEnd). The affected opponent
      // set is recomputed each continuous pass by applySuspendRestrictionRecompute (KB Q5250/Q5252).
      const self = ctx.source.permanent();
      if (self !== undefined) {
        ctx.fx.armSuspendRestrictionSource?.(self.permanentId, toDuration(action.duration ?? "untilOpponentTurnEnd"));
      }
      return false;
    }
    case "DisableTimingEffect": {
      // The disable suppresses the masked timing effects of the resolved (opponent) permanents.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.disableTimingEffect(id, action.timings, duration);
      return false;
    }
    default:
      // Unreachable: runAction routes only this family's kinds here, and its own default
      // reports anything the Action union does not cover.
      return false;
  }
}
