import {
  CardKind,
  Permanent,
  Zone,
  EffectTiming,
  EffectDuration,
  requireCardDefinition,
  CardInstance,
  resolveTokenCardId,
  type Seat,
} from "@aegis/shared";
import type { Primitives } from "../EffectContext.js";
import { resolvePermanentBattle } from "../../combat/resolve.js";
import { normalizeCost, placePermanent } from "../verbs/cardPlacement.js";
import { looseSourceRootZone } from "../verbs/looseInstances.js";

import type { PrimitivesContext } from "./context.js";

/**
 * Installing sub-triggers and replacement effects that fire later.
 */

export function createDelayedVerbs(pc: PrimitivesContext) {
  const { engine, access, continuous, continuousOpt, effectSeatStack, player, subTriggers } = pc;
  // Reached through the context because these are built in sibling modules: the
  // whole set exists before any of it runs, so forwarding at call time is safe.
  const deletePermanent: Primitives["deletePermanent"] = (...args) => pc.fx.deletePermanent(...args);

  const subscribeSubTrigger: Primitives["subscribeSubTrigger"] = (sub) => {
    // A scheduled one-shot consequence belongs to the triggered resolution that armed
    // it. Never inherit the engine-global continuous flag merely because its async
    // installation overlaps a recompute; otherwise a subsequent digivolution clears it
    // before its boundary fires (P-030/Q4141).
    const install = { ...(sub.once ? {} : continuousOpt()), ...sub };
    // The zone check reads the SETTLED `continuous` flag, so it must run on the merged
    // install rather than on the caller's partial one.
    return subTriggers.subscribe({ ...install, ...looseSourceRootZone(engine.state, install) });
  };

  const subscribeReplacement: Primitives["subscribeReplacement"] = (sub) =>
    subTriggers.subscribeReplacement({ ...sub, ...continuousOpt() });

  const playToken = async (
    seat: Seat,
    tokenName: string,
    opts?: {
      payCost?: boolean;
      suspended?: boolean;
      keywords?: Array<{ keyword: string; amount?: number; specifiers?: string[] }>;
    },
  ): Promise<Permanent | undefined> => {
    const cardId = resolveTokenCardId(tokenName);
    if (cardId === undefined) return undefined;
    const def = requireCardDefinition(cardId);
    // Token plays normally bypass RestrictPlay (Q3834), but a ruling can explicitly include
    // Digimon tokens in a matching prohibition (BT14-017/Q2381). Attribute this effect-driven
    // play to the resolving source seat so the source player's effects retain their normal
    // ability to play into the restricted seat's area (Q4675/Q4676).
    const effectSeat = effectSeatStack.at(-1) ?? seat;
    if (continuous.isPlayBlocked(effectSeat, def, "play", true)) return undefined;
    const pay = opts?.payCost !== false;
    const cost = pay ? normalizeCost(def.playCost) : 0;
    if (cost > 0 && engine.memory.maxCostFor(seat) < cost) return undefined;
    if (cost > 0) engine.memory.pay(seat, cost);

    const instance = new CardInstance();
    instance.instanceId = engine.nextInstanceId?.() ?? `inst-${Date.now()}`;
    instance.cardId = cardId;
    instance.ownerSeat = seat;
    instance.faceUp = true;

    const owner = player(seat);
    const permanent = placePermanent(engine, owner, instance, def, opts?.suspended ?? false);
    for (const keyword of opts?.keywords ?? []) {
      engine.continuous?.addKeywordGrant(
        permanent.permanentId,
        keyword.keyword,
        EffectDuration.Permanent,
        keyword.amount,
        keyword.specifiers === undefined ? undefined : { specifiers: keyword.specifiers },
      );
    }
    engine.emit({
      kind: "cardsMoved",
      instanceIds: [instance.instanceId],
      from: Zone.Deck,
      to: Zone.BattleArea,
    });
    // Fire the token's own [On Play] — it was played, not merely placed
    // (CAP-H5-05). Uses `enteredByEffect` so a by-effect gate fires
    // correctly (BT25-084).
    if (def.kinds.includes(CardKind.Digimon)) {
      await engine.fireEnteredByEffect?.(EffectTiming.OnPlay, instance.instanceId, seat);
    }
    // An EFFECT just played this token — fire the whenPlayed bus (mirrors playInstances'
    // seam) so a "when you play a [name]" / "when an effect plays a Digimon" watcher sees it
    // (KB Q3664/Q3665). A caller that plays SEVERAL same-named tokens in one resolving effect
    // (e.g. BT2-053 Keramon's [When Digivolving] playing 2 [Diaboromon] Tokens) makes one
    // `playToken` call per token; each call's fire shares the ambient resolving-effect
    // `windowToken` (see GameEngine's `beginResolvingWindow`/`fireSubTrigger`), so an
    // `oncePerTiming` watcher dedupes across them (KB Q2814) instead of firing per token.
    await engine.fireSubTrigger?.("whenPlayed", {
      subjectPermanentId: permanent.permanentId,
      playedByEffect: true,
      ...(def.level !== undefined ? { playedLevel: def.level } : {}),
      ...(def.playCost !== undefined ? { playedPlayCost: def.playCost } : {}),
    });
    return permanent;
  };

  const modifySecurityDp: Primitives["modifySecurityDp"] = (seat, delta, opts): void => {
    engine.securityDp?.add(seat, delta, {
      continuous: opts?.continuous ?? engine.inContinuousPass?.() === true,
      duration: opts?.duration,
    });
  };

  const forceBattle = async (attackerPermanentId: string, defenderPermanentId: string): Promise<void> => {
    // Direct §14 battle: compare DP via the shared resolver and delete the loser(s) through
    // the deletion primitive (so On Deletion / WhenPermanentWouldBeDeleted fire). No attack
    // declaration / block / security — and no effect-immunity check (a battle is a rule).
    const attacker = access.permanentById(attackerPermanentId);
    const defender = access.permanentById(defenderPermanentId);
    if (attacker === undefined || defender === undefined) return;
    // Production delegates to CombatController so this rules battle gets the same Iceclad,
    // Evade, Barrier, Detach, Scapegoat, Fortitude, Ascension and deletion-timing processing
    // as an attack's battle step. Crucially, the deletion cause remains battle/rules even
    // though an effect created the battle (BT26-047 Q7040-Q7041).
    if (engine.combat?.resolveBattle !== undefined) {
      await engine.combat.resolveBattle(attacker, defender);
      return;
    }
    const outcome = resolvePermanentBattle({
      attackerPermanentId,
      attackerDP: attacker.currentDP,
      defenderPermanentId,
      defenderDP: defender.currentDP,
    });
    if (outcome.deletedPermanentIds.length > 0) await deletePermanent(outcome.deletedPermanentIds, "byBattle");
    engine.emit({
      kind: "combatResolved",
      seat: attacker.controllerSeat,
      attackerPermanentId,
      deletedPermanentIds: outcome.deletedPermanentIds,
    });
  };

  const addDeletionMaxDp = (target: { seat: Seat } | { permanentId: string }, delta: number): void => {
    if ("permanentId" in target) engine.deletionMaxDp?.addSelf(target.permanentId, delta);
    else engine.deletionMaxDp?.addOwnerWide(target.seat, delta);
  };

  const deletionMaxDpBonus = (seat: Seat, sourcePermanentId?: string): number =>
    engine.deletionMaxDp?.bonusFor(seat, sourcePermanentId) ?? 0;

  const addDpDeleteBudget: NonNullable<Primitives["addDpDeleteBudget"]> = (permanentId, amount) => {
    engine.dpDeleteBudget?.add(permanentId, amount);
  };

  const dpDeleteBudgetBonus: NonNullable<Primitives["dpDeleteBudgetBonus"]> = (permanentId) =>
    engine.dpDeleteBudget?.bonusFor(permanentId) ?? 0;

  return {
    subscribeSubTrigger,
    subscribeReplacement,
    playToken,
    modifySecurityDp,
    forceBattle,
    addDeletionMaxDp,
    deletionMaxDpBonus,
    addDpDeleteBudget,
    dpDeleteBudgetBonus,
  };
}
