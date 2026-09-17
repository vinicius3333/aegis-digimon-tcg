import { Zone, EffectDuration, requireCardDefinition, CardInstance, type Seat } from "@aegis/shared";
import { extractCardAt, insertCard } from "../../state/access.js";
import { isTimingActivationDisabled } from "../timingActivation.js";
import type { Primitives } from "../EffectContext.js";

import type { PrimitivesContext } from "./context.js";

/**
 * Drawing, memory, and the ledgers that restrict either.
 */

export function createResourcesVerbs(pc: PrimitivesContext) {
  const { engine, continuous, continuousOpt, currentHandAddProvenance, durationForTarget, effectSeatStack, player } =
    pc;

  const draw = async (
    seat: Seat,
    n: number,
    opts?: { excludeInstanceIds?: readonly string[]; drawReason?: "digivolution" },
  ): Promise<CardInstance[]> => {
    const p = player(seat);
    const drawn: CardInstance[] = [];
    const excluded = new Set(opts?.excludeInstanceIds ?? []);
    for (let i = 0; i < n; i++) {
      const drawIndex = p.deck.findIndex((card) => !excluded.has(card.instanceId));
      const top = drawIndex < 0 ? undefined : extractCardAt(p, Zone.Deck, drawIndex);
      if (top === undefined) break; // deck-out; loss handled by security-and-win-check
      top.faceUp = true; // now in hand, visible to its owner
      insertCard(p, Zone.Hand, top);
      drawn.push(top);
    }
    if (drawn.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: drawn.map((c) => c.instanceId),
        from: Zone.Deck,
        to: Zone.Hand,
        seat,
        ...(opts?.drawReason ? { drawReason: opts.drawReason } : {}),
      });
      // An effect Draw is an effect-driven hand addition ("when an effect adds cards to
      // your opponent's hand"/"...your hand"). The normal draw-phase draw routes through
      // GameEngine.drawCards, not this fx.draw, so it does not fire here.
      const addedToHand = {
        instanceIds: drawn.map((c) => c.instanceId),
        byEffect: currentHandAddProvenance(),
      };
      await engine.fireSubTrigger?.("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: seat, addedToHand });
      await engine.fireSubTrigger?.("whenEffectAddsToHand", { effectAddedToHandSeat: seat, addedToHand });
    }
    return drawn;
  };

  const gainMemory = (amount: number): void => {
    engine.memory.gainMemory(amount, "gainMemory");
  };

  const gainMemoryForSeat = (seat: Seat, amount: number, opts?: { isTamerEffect?: boolean }): void => {
    engine.memory.addMemoryForSeat(seat, amount, "gainMemory", {
      isTamerEffect: opts?.isTamerEffect ?? false,
    });
  };

  const restrictMemoryGain = (seat: Seat, duration: EffectDuration): void => {
    continuous.addMemoryGainPolicy(seat, duration, continuousOpt());
  };

  const restrictCostReduction = (
    seat: Seat,
    costType: "play" | "digivolve" | "all",
    duration: EffectDuration,
  ): void => {
    continuous.addCostReductionBlock(seat, costType, duration, continuousOpt());
  };

  const restrictUnsuspendedDigivolve: Primitives["restrictUnsuspendedDigivolve"] = (seat, sourceSeat, duration) => {
    continuous.addUnsuspendedDigivolveProhibition(seat, sourceSeat, duration);
  };

  const restrictPlay: Primitives["restrictPlay"] = (seat, sourceSeat, match, mode, duration, byEffectOnly) => {
    continuous.addPlayProhibition(seat, sourceSeat, match, mode, duration, {
      ...continuousOpt(),
      byEffectOnly,
    });
  };

  const isPlayProhibited: Primitives["isPlayProhibited"] = (seat, cardId, mode, fromZone) => {
    const def = requireCardDefinition(cardId);
    // Pass effectPlay=true so byEffectOnly prohibitions are honored on the effect-play path.
    return continuous.isPlayBlocked(seat, def, mode, true, fromZone);
  };

  const disableSecurityEffect: Primitives["disableSecurityEffect"] = (attackerPermanentId, sourceKind, duration) => {
    continuous.addSecurityEffectDisable(attackerPermanentId, sourceKind, duration, continuousOpt());
  };

  const disableSecurityEffectsForSeat: Primitives["disableSecurityEffectsForSeat"] = (
    attackerSeat,
    sourceKind,
    duration,
  ) => {
    continuous.addSecurityEffectDisableForSeat(attackerSeat, sourceKind, duration, continuousOpt());
  };

  const disableTimingEffect: Primitives["disableTimingEffect"] = (permanentId, timings, duration) => {
    continuous.addEffectTimingDisable(permanentId, timings, durationForTarget(permanentId, duration), continuousOpt());
  };
  const disableTimingEffectsForPlayer: NonNullable<Primitives["disableTimingEffectsForPlayer"]> = (
    seat,
    timings,
    duration,
    matches,
  ) => {
    const ownerSeat = effectSeatStack.at(-1) ?? engine.controllerSeat();
    continuous.addPlayerEffectTimingDisable(seat, ownerSeat, timings, duration, matches, continuousOpt());
  };
  const isTimingEffectDisabled: NonNullable<Primitives["isTimingEffectDisabled"]> = (permanentId, timing) =>
    isTimingActivationDisabled(continuous, permanentId, timing);

  const declareWinner = (seat: Seat): void => {
    if (engine.win) engine.win.declareWinner(seat, "effect");
  };

  const setMemory = (value: number): void => {
    engine.memory.setMemory(value, "setMemory");
  };

  const setMemoryForSeat: Primitives["setMemoryForSeat"] = (seat, value): void => {
    engine.memory.setMemoryForSeat(seat, value, "setMemory");
  };

  return {
    draw,
    gainMemory,
    gainMemoryForSeat,
    restrictMemoryGain,
    restrictCostReduction,
    restrictUnsuspendedDigivolve,
    restrictPlay,
    isPlayProhibited,
    disableSecurityEffect,
    disableSecurityEffectsForSeat,
    disableTimingEffect,
    disableTimingEffectsForPlayer,
    isTimingEffectDisabled,
    declareWinner,
    setMemory,
    setMemoryForSeat,
  };
}
