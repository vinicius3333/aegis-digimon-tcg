import { EffectDuration, EffectTiming } from "@aegis/shared";
import { effectiveColorsOf } from "./matchLifecycle.js";
import { resolveKeywords } from "../combat/keywords.js";
import { buildResolutionEnv } from "../effects/index.js";
import { effectsOf } from "../effects/collect.js";
import type { CollectedEffect } from "../effects/collect.js";
import { engineRunSecurityCheck, payBarrierSecurityCost } from "./securityCheck.js";
import { resolutionDeps } from "./actionDeps.js";
import { counterEligibleSources } from "./intents.js";
import { combatTriggerInfo, fireTiming, fireTimingForPermanent, resolveDeletionReactions } from "./timing.js";
import { armedSubTriggers, prepareFrozenSubTrigger, prepareSubTrigger, withPendingSubTriggers } from "./subTriggers.js";
import { cardSourceOf, dropPermanentSubscriptions, effectEnvironment } from "./effectContext.js";
import { beginBattleScope, endBattleScope, sweepBattleDurations, sweepCombatDurations } from "./turnFlow.js";
import type { GameEngine } from "../GameEngine.js";
import type { CombatHooks } from "../combat/types.js";

/**
 * The combat controller's hook seam: everything CombatController calls back into the engine
 * for. Built once in the constructor, BEFORE `engine.combat` exists -- every hook is an
 * arrow read at call time, so a hook that reaches `engine.combat` is still correct.
 */
export function buildCombatHooks(engine: GameEngine): CombatHooks {
  return {
    emit: engine.hooks.emit,
    // Forward the FULL combat trigger so "when engine blocks" / "when engine deletes in
    // battle" watchers read the right ids (previously only deletedPermanentId survived).
    fireTiming: async (timing, trigger) => {
      // [When Attacking] must be scoped to the attacking permanent only — a global fire
      // would collect every permanent's [When Attacking] effect, including the opponent's,
      // on any attack. The `attackerPermanentId` is always present in a CombatTrigger.
      if (
        (timing === EffectTiming.OnUseAttack || timing === EffectTiming.OnBattleDeleteOpponent) &&
        trigger.attackerPermanentId !== undefined
      ) {
        const att = engine.access.permanentById(trigger.attackerPermanentId);
        if (att !== undefined) {
          await fireTimingForPermanent(engine, timing, att, combatTriggerInfo(engine, trigger));
          return;
        }
      }
      await fireTiming(engine, timing, {
        subjectPermanentId: trigger.subjectPermanentId,
        suspendedPermanentId: trigger.suspendedPermanentId,
        ...combatTriggerInfo(engine, trigger),
      });
    },
    fireAttackTiming: async (trigger, allianceCount, opts = {}) => {
      const includeSubTriggers = opts.includeSubTriggers === true;
      const attacker =
        trigger.attackerPermanentId === undefined
          ? undefined
          : engine.access.permanentById(trigger.attackerPermanentId);
      const top = attacker?.topCard;
      // A window opened INSIDE another effect's resolution is not the outermost one, so the
      // resolver drops `extraPending` (and `fireTimingForPermanent` may defer the window
      // wholesale). The synthetic Alliance effects would silently vanish with it, so decline
      // the combined window here and let the caller run the legacy inline Alliance loop.
      if (attacker === undefined || top === undefined || engine.activeWindowToken !== undefined) {
        if (opts.suspendedPermanentId !== undefined) {
          const suspensionTrigger = {
            ...combatTriggerInfo(engine, trigger),
            subjectPermanentId: opts.suspendedPermanentId,
            suspendedPermanentId: opts.suspendedPermanentId,
          };
          await fireTiming(engine, EffectTiming.OnTappedAnyone, suspensionTrigger);
          await engine.fireSubTrigger("whenSuspended", suspensionTrigger);
        }
        await fireTiming(engine, EffectTiming.OnUseAttack, combatTriggerInfo(engine, trigger));
        return { allianceResolvedInWindow: false, subTriggersResolvedInWindow: false };
      }
      // Attack declaration opens several trigger channels as one event. Bring continuous
      // watchers up to date before capturing any channel so every resident source is judged
      // from the same event-time board snapshot.
      await engine.recomputeContinuousEffects();
      // Each ＜Alliance＞ instance enters the attacker's [When Attacking] window as one more
      // simultaneous trigger, so the controller orders it against the printed effects instead
      // of always resolving it last (Q5257). Distinct effectKeys keep the two instances
      // independent in the resolver's `resolved` ledger; each is optional and may be declined
      // on its own. `resolveAllianceEffect` re-reads the board when it runs, so an instance
      // ordered after a derived On Play / DNA evolution sees the post-evolution allies.
      const allianceEffects: CollectedEffect[] = Array.from({ length: allianceCount }, (_, index) => ({
        source: cardSourceOf(engine, top),
        timing: EffectTiming.OnUseAttack,
        effect: {
          effectKey: `${top.instanceId}/alliance/${index}`,
          description: "＜Alliance＞: Suspend another Digimon you control.",
          // Not `optional`: the ally prompt itself carries the decline (a null response),
          // exactly as the legacy path does. Marking it optional would insert a second,
          // separate "use engine effect?" decision that ＜Alliance＞ does not have.
          optional: false,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: -1,
          canTrigger: () => true,
          // ＜Alliance＞ TRIGGERS with the attack whether or not an ally is available right
          // now (CR §15-4): it takes its place in the ordered set, and the controller may
          // put it after an effect that first creates the ally. `resolveAllianceEffect`
          // re-reads the board and does nothing when no ally is there at resolution time.
          canActivate: () => true,
          resolve: async () => engine.combat.resolveAllianceEffect(attacker.permanentId),
        },
      }));
      const attackPayload = opts.subTriggerPayload ?? combatTriggerInfo(engine, trigger);
      const suspensionPayload =
        opts.suspendedPermanentId === undefined
          ? undefined
          : {
              ...attackPayload,
              subjectPermanentId: opts.suspendedPermanentId,
              suspendedPermanentId: opts.suspendedPermanentId,
            };
      const attackEnvironment = buildResolutionEnv(
        effectEnvironment(engine, { ...attackPayload, ...(suspensionPayload ?? {}) }),
        resolutionDeps(engine),
      );
      const allyAttackEffects = attackEnvironment.collect(EffectTiming.OnAllyAttack);
      // Suspending the attacker and declaring the attack are the same game event. Effects
      // triggered by either part share one activation order (§11-2-8, §15-4-3), including
      // [On Tapped] timing effects and the `whenSuspended` watcher bus.
      const suspensionEffects =
        suspensionPayload === undefined
          ? []
          : attackEnvironment
              .collect(EffectTiming.OnTappedAnyone)
              .map((effect) => ({ ...effect, triggerInfo: suspensionPayload }));
      const pendingAttackEffects = [...allyAttackEffects, ...suspensionEffects, ...allianceEffects];
      const timingWindow = async () =>
        fireTimingForPermanent(engine, EffectTiming.OnUseAttack, attacker, attackPayload, pendingAttackEffects);
      const subTriggerPayload = opts.subTriggerPayload ?? combatTriggerInfo(engine, trigger);
      if (includeSubTriggers) {
        await withPendingSubTriggers(
          engine,
          suspensionPayload === undefined
            ? ["whenAttacking", "whenOpponentAttacks"]
            : ["whenSuspended", "whenAttacking", "whenOpponentAttacks"],
          suspensionPayload === undefined ? subTriggerPayload : { ...subTriggerPayload, ...suspensionPayload },
          timingWindow,
          {
            onlyInitiallyArmed: true,
            busTrigger: () =>
              suspensionPayload === undefined ? subTriggerPayload : { ...subTriggerPayload, ...suspensionPayload },
          },
        );
      } else {
        await timingWindow();
      }
      return { allianceResolvedInWindow: allianceCount > 0, subTriggersResolvedInWindow: includeSubTriggers };
    },
    fireSubTrigger: async (event, payload) => engine.fireSubTrigger(event, payload),
    prepareSubTrigger: (event, payload) => prepareSubTrigger(engine, event, payload),
    armedSubTriggerCount: (event, payload) =>
      armedSubTriggers(engine, engine.subTriggers.subscriptionsFor(event), payload).length,
    withPendingAttackSubTriggers: (payload, runWindows) =>
      withPendingSubTriggers(engine, ["whenAttacking", "whenOpponentAttacks"], payload, runWindows, {
        onlyInitiallyArmed: true,
      }),
    prepareFrozenSubTrigger: (event, payload) => prepareFrozenSubTrigger(engine, event, payload),
    refreshContinuousEffects: () => engine.recomputeContinuousEffects(),
    resolveDeletionReactions: async (trigger, candidates, transientCandidates = []) =>
      resolveDeletionReactions(
        engine,
        trigger,
        candidates,
        (deletionTrigger) => fireTiming(engine, EffectTiming.OnDestroyedAnyone, deletionTrigger, transientCandidates),
        transientCandidates,
      ),
    effectiveColorsOf: (permanentId) => {
      const permanent = engine.access.permanentById(permanentId);
      return permanent === undefined ? [] : effectiveColorsOf(engine, permanent);
    },
    consultLeavePrevention: async (permanentIds, opts) =>
      engine.consultLeavePrevention(permanentIds, "byBattle", undefined, opts),
    dropPermanentSubscriptions: (permanentId) => dropPermanentSubscriptions(engine, permanentId),
    snapshotCustomEffectGrants: (departingInstanceIds) =>
      engine.continuous.listCustomEffectGrants().map((grant) => {
        if (!departingInstanceIds.includes(grant.instanceId)) return grant;
        const activeAtDeletion = grant.isActive?.() ?? true;
        return { ...grant, isActive: () => activeAtDeletion };
      }),
    checkSecurity: async (defenderSeat, attackerPermanentId, reason, options) =>
      engineRunSecurityCheck(engine, defenderSeat, attackerPermanentId, reason, options),
    // The pierce read seam: combat consults both the temporary modifier ledger and
    // the resolved printed/continuous keyword state. Printed ＜Piercing＞ lives in the
    // latter; only effect-granted, battle-scoped Piercing lives in the former.
    hasPierce: (permanentId) =>
      engine.modifiers.hasPierce(permanentId) ||
      (() => {
        const permanent = engine.access.permanentById(permanentId);
        return permanent !== undefined && resolveKeywords(permanent, engine.continuous).includes("Piercing");
      })(),
    addDpModifier: (permanentId, delta) =>
      engine.modifiers.addDpModifier(engine.state, permanentId, delta, EffectDuration.UntilEndAttack),
    addSecurityAttack: (permanentId) =>
      engine.continuous.addKeywordGrant(permanentId, "SecurityAttack", EffectDuration.UntilEndAttack, 1),
    barrierFired: (key) => engine.tracker.count(key, "replacement") > 0,
    markBarrierFired: (key) => engine.tracker.register(key, "replacement"),
    trashTopSecurityForBarrier: (seat) => payBarrierSecurityCost(engine, seat),
    sweepEndOfAttack: () => sweepCombatDurations(engine),
    beginBattleScope: () => beginBattleScope(engine),
    sweepEndOfBattle: (scopeId) => sweepBattleDurations(engine, scopeId),
    endBattleScope: (scopeId) => endBattleScope(engine, scopeId),
    recomputeBattleEffects: () => engine.recomputeContinuousEffects(),
    continuous: engine.continuous,
    hasKeyword: (permanentId, keyword) => {
      const permanent = engine.access.permanentById(permanentId);
      return permanent !== undefined && resolveKeywords(permanent, engine.continuous).includes(keyword);
    },
    // Q5257: ＜Alliance＞ printed twice on the same Digimon (typically once on the top card
    // and once inherited from a digivolution source) is TWO independent keywords, each
    // suspending its own ally for its own DP/security benefit. A printed keyword reaches the
    // permanent as one continuous grant per granting effect, so the grants ARE the instances;
    // the fallback covers a permanent that has the keyword through some path that leaves no
    // countable grant, which is always a single instance.
    allianceCount: (permanentId) => {
      const permanent = engine.access.permanentById(permanentId);
      if (permanent?.topCard === undefined) return 0;
      const granted = engine.continuous
        .grantedKeywords(permanentId)
        .filter((grant) => grant.keyword === "Alliance").length;
      if (granted > 0) return granted;
      return resolveKeywords(permanent, engine.continuous).includes("Alliance") ? 1 : 0;
    },
    combineAllianceTiming: (permanentId) => {
      const permanent = engine.access.permanentById(permanentId);
      if (permanent?.topCard === undefined) return false;
      // An inherited [When Attacking] effect is as simultaneous with ＜Alliance＞ as a printed
      // one (Q5257), so the digivolution cards and link cards count too. Reading only the top
      // card left an attacker whose sole When Attacking effect is inherited on the legacy
      // path, where Alliance always resolved last and could never be ordered against it.
      return [permanent.topCard, ...permanent.stack, ...permanent.linked].some(
        (card) => effectsOf(EffectTiming.OnUseAttack, cardSourceOf(engine, card)).length > 0,
      );
    },
    // Shared "pick one of these, or pass" decision channel for ＜Raid＞'s redirect choice and
    // ＜Scapegoat＞'s sacrifice choice (both battle-path consumers of combat/controller.ts) —
    // the same generic selectCards decision `ask.selectInstances` uses in primitives.ts, so no
    // bespoke per-keyword protocol intent is needed.
    selectOptionalInstance: async (seat, candidateInstanceIds, promptText) => {
      if (candidateInstanceIds.length === 0) return undefined;
      const response = await engine.decisions.request({
        seat,
        kind: "selectCards",
        promptText,
        options: { candidateInstanceIds, min: 0, max: 1 },
      });
      return response.kind === "selectCards" ? response.instanceIds[0] : undefined;
    },
    // ＜Fragment＞'s "choose exactly N, or decline" cost decision (§16-37): the same
    // selectCards decision channel as selectOptionalInstance, but requiring the full count
    // (a partial pick reads as a decline — no partial trash).
    selectOptionalInstances: async (seat, candidateInstanceIds, count, promptText) => {
      if (candidateInstanceIds.length < count) return undefined;
      const response = await engine.decisions.request({
        seat,
        kind: "selectCards",
        promptText,
        options: { candidateInstanceIds, min: 0, max: count },
      });
      if (response.kind !== "selectCards") return undefined;
      return response.instanceIds.length === count ? response.instanceIds : undefined;
    },
    armorPurge: async (permanentId) => {
      await engine.primitives.armorPurge(permanentId);
    },
    trashDigivolutionCards: async (hostPermanentId, instanceIds) => {
      await engine.primitives.trashDigivolutionCards(hostPermanentId, instanceIds);
    },
    ascendToSecurity: async (instanceId) => {
      await engine.primitives.ascendToSecurity(instanceId);
    },
    materialSave: async (permanentId) => {
      await engine.primitives.materialSave(permanentId);
    },
    // §11-3 Counter Timing: whether the defending seat has anything to activate,
    // so `runCounterWindow` can skip the round trip when nothing is eligible.
    counterEligible: (seat) => counterEligibleSources(engine, seat),
  };
}
