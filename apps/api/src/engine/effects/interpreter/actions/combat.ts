// Attacking, battling, and redirecting an attack.

import type { EffectContext } from "../../EffectContext.js";
import type { ActionScope } from "../dispatch.js";
import { toDuration } from "../duration.js";
import { candidatePermanents, resolvePermanentTargets } from "../targeting/permanents.js";
import type { Action } from "@aegis/shared";

export async function runCombatAction(ctx: EffectContext, action: Action, scope: ActionScope): Promise<boolean> {
  const { deferredCostSuspensions } = scope;
  switch (action.kind) {
    case "Attack": {
      // "This Digimon attacks" (self) or "1 of your Digimon attacks" (targeted): make
      // the resolved permanent(s) declare an attack. The controller chooses each
      // attack's target (player / suspended enemy Digimon) inside the combat verb.
      // `withoutSuspending` declares the attack without tapping the attacker.
      const attackSubject = action.attacker ?? action.subject ?? action.target;
      if (attackSubject === undefined) return false;
      let suspensionTriggersFired = false;
      const fireDeferredSuspensionTriggers = async (): Promise<void> => {
        if (suspensionTriggersFired || deferredCostSuspensions.length === 0) return;
        suspensionTriggersFired = true;
        await ctx.fx.fireSuspensionTriggers?.(deferredCostSuspensions, {
          byEffectSeat: ctx.source.ownerSeat,
          byEffectCardId: ctx.source.cardId,
        });
      };
      if (action.drainTimingWindowDuringAttack && ctx.fx.isAttackResolving?.()) {
        await fireDeferredSuspensionTriggers();
        return false;
      }
      const opts = {
        withoutSuspending: action.withoutSuspending ?? false,
        vortex: action.vortex,
        ignoreSummoningSickness: true,
        attackPlayer:
          action.attackPlayer ??
          (action.target !== undefined &&
          action.target !== attackSubject &&
          action.target.filter.kind?.includes("Digimon")
            ? false
            : undefined),
        attackMechanic: action.attackMechanic,
        afterAttackTriggers: fireDeferredSuspensionTriggers,
        drainTimingWindow: action.drainTimingWindowDuringAttack ? ctx.drainCurrentTimingWindow : undefined,
      };
      if (attackSubject.isSelf || attackSubject.filter?.isSelfRef) {
        const self = ctx.source.permanent();
        if (self !== undefined) await ctx.fx.forceAttack(self.permanentId, opts);
        await fireDeferredSuspensionTriggers();
        return false;
      }
      const ids = await resolvePermanentTargets(ctx, attackSubject);
      for (const id of ids) await ctx.fx.forceAttack(id, opts);
      await fireDeferredSuspensionTriggers();
      return false;
    }
    case "Battle": {
      // Direct battle ("1 of your Digimon may battle 1 of your opponent's Digimon"): resolve
      // an attacker (self or chosen) and a defender (chosen opponent Digimon), then run a §14
      // DP battle. Optional => the controller may decline either pick.
      let attackerId: string | undefined;
      if (action.attacker.isSelf || action.attacker.filter.isSelfRef) {
        attackerId = ctx.source.permanent()?.permanentId;
      } else {
        attackerId = (await resolvePermanentTargets(ctx, action.attacker, { preserveUnaffectableSelection: true }))[0];
      }
      if (attackerId === undefined) return false;
      // The compiler emits the defender as either `defender` or the alternative `target`
      // (BattleAction allows both); honor whichever is present.
      const defenderTarget = action.defender ?? action.target;
      if (defenderTarget === undefined) return false;
      // Q7016: the selection is performed by an effect, but the battle itself is rule
      // processing. An unaffected Digimon remains a legal choice and can still lose the
      // ensuing DP comparison, so retain chosen immune ids for both battle participants.
      const defenderId = (
        await resolvePermanentTargets(ctx, defenderTarget, { preserveUnaffectableSelection: true })
      )[0];
      if (defenderId === undefined) return false;
      await ctx.fx.forceBattle?.(attackerId, defenderId);
      return false;
    }
    case "RedirectAttack": {
      // Legacy generated IR encodes "end the attack" as a RedirectAttack mode with no
      // target (BT13-088/BT16-032). Optional activation is handled by runAction before
      // dispatch; once accepted, this is the same primitive as the canonical EndAttack.
      if (action.mode === "endAttack") {
        ctx.fx.endAttack();
        return false;
      }
      // "Change the target of the attack to 1 of your Digimon": resolve the candidate
      // permanents from the filter and let the CHOOSER pick which becomes the new attack
      // target. `chooser` defaults to "controller" (the source's controller); BT4-075 sets
      // "opponent" so the DEFENDING player chooses among their own unsuspended Digimon, and
      // `optional` lets them decline. A no-op when no attack is open (combat guards it).
      if (action.chooser === "opponent") {
        // The DEFENDING player picks among THEIR OWN matching Digimon — enumerate the
        // candidates (scoped to the opponent/defender seat; the recognizer may strip the
        // controller predicate when the activation gate already credits it) without prompting
        // the controller; the primitive prompts the opponent. Optional => may decline.
        const candidateSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
        const scopedTarget = { ...action.target, filter: { ...action.target.filter, controller: "opponent" as const } };
        const ids = candidatePermanents(ctx, scopedTarget).map((p) => p.permanentId);
        await ctx.fx.redirectAttack(ids, { chooserSeat: candidateSeat, optional: action.optional ?? false });
        return false;
      }
      const ids = await resolvePermanentTargets(ctx, action.target);
      if (action.includePlayer) ids.push("player");
      await ctx.fx.redirectAttack(ids, { optional: action.optional ?? false });
      return false;
    }
    case "SelectBind": {
      // Resolve the binding target and record the chosen permanentId under its handle for a
      // later action's relativeTo / fromSelectionRef / underSelectionRef to reference. No other
      // effect. When nothing is chosen the handle stays unset and dependents resolve to nothing.
      const name = action.target.bindAs;
      if (name === undefined) return false;
      const target = action.chooser === undefined ? action.target : { ...action.target, chooser: action.chooser };
      const existingIds = ctx.boundPlayed?.get(name);
      const existingId = ctx.selections?.get(name);
      const ids =
        existingIds !== undefined
          ? [...existingIds]
          : existingId !== undefined
            ? [existingId]
            : await resolvePermanentTargets(ctx, target);
      if (ids.length > 0) {
        ctx.selections ??= new Map();
        ctx.selections.set(name, ids[0]!);
        // Keep the scalar binding for relative attribute comparisons, and retain the complete
        // chosen set for plural `fromSelectionRef` consumers (for example, "suspend 2 ... cards
        // this effect suspended can't unsuspend"). `boundPlayed` is already the resolution-scoped
        // set-valued binding store read by target resolution, despite its historical name.
        ctx.boundPlayed ??= new Map();
        ctx.boundPlayed.set(name, new Set(ids));
        const bound = ctx.game.permanentById(ids[0]!);
        if (bound !== undefined) {
          const definition = bound.topCard ? ctx.game.definitionOf(bound.topCard) : undefined;
          ctx.selectionFacts ??= new Map();
          ctx.selectionFacts.set(name, {
            dp: bound.currentDP,
            level: definition?.level,
            playCost: definition?.playCost,
            digivolutionCount: bound.stack.length,
          });
        }
      }
      return false;
    }
    case "EndAttack": {
      // "End that attack" (BT23-069): terminate the in-flight attack (transition to
      // end-of-attack). A no-op when no attack is open; changes the timing, not the Digimon.
      ctx.fx.endAttack();
      return false;
    }
    case "GrantCanAttackUnsuspended": {
      // "This Digimon may also attack your opponent's unsuspended Digimon" (ST12-08): a
      // positive attack-legality grant on the resolved target(s), read by combat legality.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      const noDigivolutionCards = action.noDigivolutionCards === true;
      for (const id of ids)
        ctx.fx.grantCanAttackUnsuspended(id, duration, {
          noDigivolutionCards,
          defenderLevelMax: action.defenderLevelMax,
        });
      return false;
    }
    case "GrantVortexCanAttackPlayers": {
      // EX11-062 [Your Turn]: "while your opponent has no unsuspended Digimon, your ＜Vortex＞ can
      // also attack players" (KB Q5920). A positive ＜Vortex＞ attack-target grant on the resolved
      // target(s) (your Digimon), read by combat legality for a ＜Vortex＞-mode declaration. The
      // [Your Turn] condition (opponent has no unsuspended Digimon) is evaluated by the effect's
      // own condition gate; this records the grant when the effect fires.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.grantVortexCanAttackPlayers?.(id, duration);
      return false;
    }
    default:
      // Unreachable: runAction routes only this family's kinds here, and its own default
      // reports anything the Action union does not cover.
      return false;
  }
}
