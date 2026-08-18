import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, turnTiming, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Vortexdramon — EX11-074 (Green Lv.7 Digimon).
//
// Hand-written override of the declarative effect record (card-module contract + the
// file-header convention: omitting the AUTO-GENERATED header preserves this file
// across regeneration). The declarative effect record was non-executable / wrong on the two
// triggered windows:
//   - it dropped the "their Digimon's effects don't affect this Digimon" immunity
//     entirely (the IR carried only Suspend + ModifyDP);
//   - it targeted the +6000 DP at "1 of your opponent's Digimon" — the buff is on
//     THIS Digimon (self), not the opponent's; and
//   - it gated the buff with `condition: { kind: "raw" }`, which the interpreter
//     evaluates as ALWAYS FALSE (evaluateCondition: "raw" -> false), so the buff
//     never fired. The real gate is "if THIS effect suspended YOUR Digimon", a
//     sequential data dependency on the chosen suspend target that the IR Condition
//     union cannot express. A hand-written module captures the chosen permanent and
//     checks it exactly, so the buff applies iff a your-side Digimon was suspended
//     by this effect (and never over-applies).
//
// Printed `effectText` (cards.json) is authoritative here — KB reports NO errata
// (`node tools/kb/query.mjs card EX11-074`):
//   "[Digivolve] While you have [Shoto Kazama], [GrandGalemon]: Cost 6"
//   "＜Piercing＞ ＜Vortex＞ ＜Blocker＞"
//   "[When Digivolving] [When Attacking] You may suspend 1 Digimon. If this effect
//    suspended your Digimon, until your opponent's turn ends, their Digimon's
//    effects don't affect this Digimon and it gets +6000 DP."
//   "[All Turns] [Once Per Turn] When any Digimon suspend, this Digimon may
//    unsuspend. Then, this Digimon may battle 1 of your opponent's Digimon."
//
// KB (authoritative) — bound Q&A rulings consulted (12 entries; the load-bearing ones):
//   - Q5948: the [When Digivolving] [When Attacking] effect may suspend EITHER your
//     OR your opponent's Digimon. So the suspend target is any battle-area Digimon
//     (both sides); the +6000/immunity reward is gated on a YOUR-side Digimon having
//     the engine's `beAffected` restriction ("unaffected by your opponent's effects",
//     EffectContext.ts Restriction). Modeled as restrict(self, "beAffected", ...).
//     `new IBattle(self, target, null, true)` forced-battle path) — a rule that
//     compares DP, NOT an attack declaration. It does not open a block window, does
//     not suspend the attacker, and is not a security check (see BLOCKED note below).
const cardId = "EX11-074";

/** Suspend candidates (Q5948): any battle-area Digimon, either side, that this effect
 *  can actually suspend — not already suspended and not immune to this effect. Mirrors
 *  post-selection guard (!IsSuspended && CanSuspend && !TopCard.CanNotBeAffected). */
const suspendCandidates = (ctx: EffectContext): Permanent[] => {
  const seats: readonly Seat[] = [ctx.source.ownerSeat, ctx.game.opponentOf(ctx.source.ownerSeat)];
  const out: Permanent[] = [];
  for (const seat of seats) {
    for (const permanent of ctx.game.player(seat).battleArea) {
      if (permanent.isSuspended) continue;
      if (permanent.topCard === undefined) continue;
      if (!isDigimon(ctx.game.definitionOf(permanent.topCard))) continue;
      out.push(permanent);
    }
  }
  return out;
};

/**
 * Shared [When Digivolving] / [When Attacking] body:
 * optionally suspend 1 Digimon (either side, Q5948); if a YOUR-side Digimon was the one
 * suspended, give THIS Digimon immunity to the opponent's Digimon effects and +6000 DP
 * until the opponent's turn ends. The builder's `optional: true` already asked the "You
 * may" question, so here we resolve the sub-choices.
 */
const suspendThenSelfBuff = async (ctx: EffectContext): Promise<void> => {
  const self = ctx.source.permanent();
  if (self === undefined) return;

  const candidates = suspendCandidates(ctx);
  if (candidates.length === 0) return; // nothing to suspend; the optional reward needs a suspend

  // "You may suspend 1 Digimon" — let the controller decline (canNoSelect: true => min 0).
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map((p) => p.permanentId),
    min: 0,
    max: 1,
  });
  const chosenId = chosen[0];
  if (chosenId === undefined) return; // declined to suspend -> no reward

  ctx.fx.suspend([chosenId]);

  // "If this effect suspended YOUR Digimon" — the reward applies to THIS Digimon only
  // when the card we just suspended is the controller's own and is now suspended
  const suspended = ctx.game.permanentById(chosenId);
  const wasYours =
    suspended !== undefined && suspended.isSuspended && suspended.controllerSeat === ctx.source.ownerSeat;
  if (!wasYours) return;

  // Until the opponent's turn ends: opponent's Digimon effects don't affect this Digimon,
  // and ChangeDigimonDP(thisPermanent, 6000, UntilOpponentTurnEnd).
  ctx.fx.restrict(self.permanentId, "beAffected", EffectDuration.UntilOpponentTurnEnd);
  ctx.fx.modifyDP(self.permanentId, 6000, EffectDuration.UntilOpponentTurnEnd);
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ＜Piercing＞ ＜Vortex＞ ＜Blocker＞ — printed (non-inherited) keyword abilities.
    // continuous abilities recorded in the continuous tier each recompute pass
    // (clear-then-recompute makes the re-grant idempotent — GameEngine.recomputeContinuousEffects).
    //   - ＜Blocker＞: grantKeyword -> continuous-effect ledger; the attack/block subsystem
    //     reads it (combat/legality.ts hasBlocker: printed OR granted).
    //   - ＜Piercing＞: grantPierce -> ModifierLedger's dedicated pierce store (hasPierce).
    //   - ＜Vortex＞: grantKeyword recorded as real server state. The Vortex BEHAVIOR
    //     (take another turn after deleting an opponent's Digimon in battle, and the
    //     attack-players permission) has no runtime subsystem yet — an engine-wide gap
    //     shared by every ＜Vortex＞ card (EX7-036 / ST18-12 / EX11-062). Recorded, not
    //     faked; it activates once a Vortex subsystem reads the grant.
    if (timing === EffectTiming.None) {
      const keyword = (
        key: string,
        description: string,
        grant: (ctx: EffectContext, permanentId: string) => void,
      ): Effect =>
        staticModifier({
          source,
          effectKey: `${cardId}/${key}`,
          description,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) grant(ctx, self.permanentId);
          },
        });
      return [
        keyword("blocker", "＜Blocker＞", (ctx, id) =>
          ctx.fx.grantKeyword(id, "Blocker", EffectDuration.UntilEachTurnEnd),
        ),
        keyword("piercing", "＜Piercing＞", (ctx, id) =>
          ctx.fx.grantPierce(id, EffectDuration.UntilEachTurnEnd),
        ),
        keyword("vortex", "＜Vortex＞", (ctx, id) =>
          ctx.fx.grantKeyword(id, "Vortex", EffectDuration.UntilEachTurnEnd),
        ),
      ];
    }

    // [When Digivolving] You may suspend 1 Digimon. If this effect suspended your
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] You may suspend 1 Digimon. If this effect suspended your " +
            "Digimon, until your opponent's turn ends, their Digimon's effects don't affect " +
            "this Digimon and it gets +6000 DP.",
          optional: true,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: suspendThenSelfBuff,
        }),
      ];
    }

    // + IsExistOnBattleAreaDigimon. The engine fires the When Attacking window as
    // OnUseAttack (the whenAttacking builder binds to it — see interpreter timingForTrigger).
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking`,
          description:
            "[When Attacking] You may suspend 1 Digimon. If this effect suspended your " +
            "Digimon, until your opponent's turn ends, their Digimon's effects don't affect " +
            "this Digimon and it gets +6000 DP.",
          optional: true,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: suspendThenSelfBuff,
        }),
      ];
    }

    // [All Turns] [Once Per Turn] When any Digimon suspend, this Digimon may unsuspend.
    // Then, this Digimon may battle 1 of your opponent's Digimon.
    //   optionally unsuspends THIS permanent, then optionally runs a forced direct battle
    //   `new IBattle(self, selectedOpponentDigimon, null, true).Battle()`.
    //
    // PARTIALLY BLOCKED (represented, not faked — mirrors EX10-013's blocked breeding
    // move and EX11-062's documented residuals):
    //   1. The "may battle 1 of your opponent's Digimon" sub-clause is a DIRECT forced
    //      battle (Q5955-Q5959: a DP-comparison battle, not an attack — no block window,
    //      no attacker suspend, separate <Piercing>). There is NO direct-battle verb on
    //      the effect primitives surface (ctx.fx.*): the combat verbs exposed are
    //      forceAttack/redirectAttack only, and forceAttack is a full ATTACK
    //      (suspends the attacker, opens a block window, hands off to the security check,
    //      and can only target the player or a SUSPENDED enemy Digimon) — semantically
    //      wrong for "battle 1 of your opponent's Digimon". `resolvePermanentBattle`
    //      (combat/resolve.ts) is the right pure resolver but is an engine internal, not
    //      reachable from a card file. Left unimplemented until a direct-battle primitive
    //      (e.g. ctx.fx.battle(attackerId, defenderId)) exists.
    //   2. Trigger seam: the engine does not yet fire OnTappedAnyone / a "when suspended"
    //      window (GameEngine.fireTiming fires WhenDigivolving and the combat timings;
    //      suspend fires no timing). So this effect's window is currently never reached.
    //      Registered at the correct timing so it activates the moment that seam is wired;
    //      the unsuspend half below is then fully executable, and only the battle remains
    //      gated on the missing direct-battle primitive.
    if (timing === EffectTiming.OnTappedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/all-turns-unsuspend-battle`,
          description:
            "[All Turns] [Once Per Turn] When any Digimon suspend, this Digimon may unsuspend. " +
            "Then, this Digimon may battle 1 of your opponent's Digimon.",
          optional: false, // each sub-step is its own "may"; do not gate the whole effect
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            // "This Digimon may unsuspend."
            const self = ctx.source.permanent();
            if (self !== undefined && self.isSuspended) {
              const unsuspend = await ctx.ask.optional(ctx, "Unsuspend this Digimon?");
              if (unsuspend) ctx.fx.unsuspend([self.permanentId]);
            }
            // "Then, this Digimon may battle 1 of your opponent's Digimon."
            // BLOCKED: no direct-battle primitive on ctx.fx (see header note above).
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
