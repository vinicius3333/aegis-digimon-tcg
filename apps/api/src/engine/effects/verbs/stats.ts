import { EffectDuration, requireCardDefinition } from "@aegis/shared";
import type { EvoCostMatch } from "../modifiers.js";
import type { Primitives } from "../EffectContext.js";
import { normalizeCost } from "../verbs/cardPlacement.js";
import { looseZoneOfInstance, ownerSeatOfLoose, peekLooseInstance } from "../verbs/looseInstances.js";

import type { PrimitivesContext } from "./context.js";

/**
 * DP, keywords and cost adjustments held for a duration.
 */

export function createStatsVerbs(pc: PrimitivesContext) {
  const {
    engine,
    access,
    continuous,
    continuousOpt,
    durationForTarget,
    effectSeatStack,
    effectSourceKindsStack,
    ledger,
    state,
  } = pc;
  // Reached through the context because these are built in sibling modules: the
  // whole set exists before any of it runs, so forwarding at call time is safe.
  const effectDrivenPlayCost: PrimitivesContext["helpers"]["effectDrivenPlayCost"] = (...args) =>
    pc.helpers.effectDrivenPlayCost(...args);
  const modifyDP: Primitives["modifyDP"] = (permanentId, delta, duration, opts): void => {
    const before = access.permanentById(permanentId);
    if (before === undefined) return; // no such battle-area permanent; nothing to buff
    // "DP can't be reduced" (§15-1-3). Every printed instance of this protection says REDUCED
    // (BT3-105, EX1-073, BT23-085, BT7-064, BT9-098, BT19-089), so it gates negative deltas
    // only — a buff still lands on a DP-immune Digimon.
    const byOpponentEffect = pc.helpers.isOpponentEffectAgainst(permanentId);
    if (delta < 0 && continuous.hasRestriction(permanentId, "dpImmune", undefined, { byOpponentEffect })) return;
    ledger.addDpModifier(state, permanentId, delta, durationForTarget(permanentId, duration), {
      ...(opts?.continuous === undefined ? continuousOpt() : { continuous: opts.continuous }),
      ...(opts?.sourceInstanceId !== undefined ? { sourceInstanceId: opts.sourceInstanceId } : {}),
      ...((opts?.sourceSeat ?? effectSeatStack.at(-1)) !== undefined
        ? { sourceSeat: opts?.sourceSeat ?? effectSeatStack.at(-1) }
        : {}),
      ...((opts?.sourceKinds ?? effectSourceKindsStack.at(-1)) !== undefined
        ? { sourceKinds: opts?.sourceKinds ?? effectSourceKindsStack.at(-1) }
        : {}),
      ...(opts?.skipsCurrentOpponentTurnEnd === true ? { skipsCurrentOpponentTurnEnd: true } : {}),
    });
    // currentDP was recomputed by the ledger; no dedicated ServerEvent in the
    // protocol for a DP change — the schema delta (currentDP) is the source of truth.
  };

  const modifyPlayerDP: Primitives["modifyPlayerDP"] = (seat, delta, duration, opts): void => {
    ledger.addPlayerDpModifier(state, seat, delta, duration, {
      ...opts,
      ...((opts?.sourceSeat ?? effectSeatStack.at(-1)) !== undefined
        ? { sourceSeat: opts?.sourceSeat ?? effectSeatStack.at(-1) }
        : {}),
      ...((opts?.sourceKinds ?? effectSourceKindsStack.at(-1)) !== undefined
        ? { sourceKinds: opts?.sourceKinds ?? effectSourceKindsStack.at(-1) }
        : {}),
    });
  };

  const restoreDpReductions: Primitives["restoreDpReductions"] = (permanentId): void => {
    ledger.restoreDpReductions(state, permanentId);
  };

  const setBaseDP = (permanentId: string, value: number, duration: EffectDuration): void => {
    const before = access.permanentById(permanentId);
    if (before === undefined) return; // no such battle-area permanent; nothing to override
    // A "this Digimon's DP becomes N" override that LOWERS the DP is a DP reduction, so the same
    // `dpImmune` protection applies. An override that raises it is not, and lands normally.
    const resolvingSeat = effectSeatStack.at(-1);
    const byOpponentEffect = resolvingSeat !== undefined && resolvingSeat !== before.controllerSeat;
    if (value < before.currentDP && continuous.hasRestriction(permanentId, "dpImmune", undefined, { byOpponentEffect }))
      return;
    ledger.addBaseDpOverride(state, permanentId, value, durationForTarget(permanentId, duration), {
      ...continuousOpt(),
      ...(effectSeatStack.at(-1) === undefined ? {} : { sourceSeat: effectSeatStack.at(-1) }),
      ...(effectSourceKindsStack.at(-1) === undefined ? {} : { sourceKinds: effectSourceKindsStack.at(-1) }),
      ...(continuous.originalCardInfoOverride(permanentId) === undefined ? {} : { requiresDigimonTop: true }),
    });
    // currentDP was recomputed by the ledger (override replaces base, deltas sum on top).
  };

  const grantPierce: Primitives["grantPierce"] = (permanentId, duration, opts): void => {
    ledger.addPierceGrant(permanentId, durationForTarget(permanentId, duration), {
      ...(opts?.continuous === true ? { continuous: true } : continuousOpt()),
      durationOwnerSeat: access.permanentById(permanentId)?.controllerSeat,
    });
  };

  const changeEvoCost = (
    filter: (m: EvoCostMatch) => boolean,
    delta: number,
    opts?: {
      setFixed?: boolean;
      once?: boolean;
      continuous?: boolean;
      onConsume?: (match: EvoCostMatch) => void;
      intrinsicCardId?: string;
      intrinsicEffectKey?: object;
    },
  ): void => {
    ledger.addEvoCostAdjustment(filter, delta, opts?.setFixed ?? false, {
      ...(opts?.continuous !== undefined ? { continuous: opts.continuous } : (continuousOpt() ?? {})),
      once: opts?.once,
      onConsume: opts?.onConsume,
      intrinsicCardId: opts?.intrinsicCardId,
      intrinsicEffectKey: opts?.intrinsicEffectKey,
    });
  };

  const changePlayCost: Primitives["changePlayCost"] = (filter, delta, opts) => {
    ledger.addPlayCostAdjustment(filter, delta, opts?.setFixed ?? false, {
      ...(opts?.continuous !== undefined ? { continuous: opts.continuous } : (continuousOpt() ?? {})),
    });
  };

  /**
   * Resolve the cost of an effect-driven paid play through the same modifier ledger as a
   * normal play. Card-text reductions such as "with the play cost reduced by 5" and
   * DigiXros reductions are additional reductions after SET-cost effects and therefore
   * stack with active self/field reducers. A "play costs can't be reduced" restriction
   * suppresses those explicit reductions just as it suppresses ledger reductions.
   */
  const canAffordEffectPlay: NonNullable<Primitives["canAffordEffectPlay"]> = async (instanceId, opts) => {
    const ownerSeat = ownerSeatOfLoose(state, instanceId);
    const instance = peekLooseInstance(state, instanceId);
    if (ownerSeat === undefined || instance === undefined) return false;
    const definition = requireCardDefinition(instance.cardId);
    const controllerSeat = opts?.controllerSeat ?? ownerSeat;
    const originZone = looseZoneOfInstance(state, instanceId);
    const cost = await effectDrivenPlayCost(
      instanceId,
      definition,
      controllerSeat,
      opts?.costDelta,
      opts?.useAsOption,
      undefined,
      originZone,
      true,
    );
    // Pending effects finish resolving before the turn ends (CR §6-1-4-1). That includes a
    // paid Option use started by the resolving effect after the enclosing action crossed the
    // gauge; affordability is the remaining distance to the gauge limit, just like an
    // effect-driven Digimon play.
    return cost >= 0 && cost <= engine.memory.maxCostFor(controllerSeat);
  };

  const effectivePlayCost: NonNullable<Primitives["effectivePlayCost"]> = (permanent) => {
    const definition = requireCardDefinition(permanent.topCard.cardId);
    return ledger.playCostFor(
      { def: definition, controllerSeat: permanent.controllerSeat, permanentId: permanent.permanentId },
      normalizeCost(definition.playCost),
    );
  };

  const effectiveLooseUseCost: NonNullable<Primitives["effectiveLooseUseCost"]> = (instanceId, controllerSeat) => {
    const projected = engine.effectiveLooseUseCost?.(instanceId, controllerSeat);
    if (projected !== undefined) return projected;
    const instance = peekLooseInstance(state, instanceId);
    if (instance === undefined) return undefined;
    const definition = requireCardDefinition(instance.cardId);
    return ledger.playCostFor({ def: definition, controllerSeat }, normalizeCost(definition.playCost));
  };

  return {
    modifyDP,
    modifyPlayerDP,
    restoreDpReductions,
    setBaseDP,
    grantPierce,
    changeEvoCost,
    changePlayCost,
    canAffordEffectPlay,
    effectivePlayCost,
    effectiveLooseUseCost,
  };
}
