/* The five questions combat itself asks: block, counter, alliance, evade and barrier.

   Each is a question for this seat exactly as a `pendingDecision` is, but it answers
   through its own intent rather than the decision channel, and the server never opens
   one while a decision is unanswered — so at most one of these is ever on screen. */

import type { GameState } from "@aegis/shared";
import { findPermanentInState, instanceCardId, permCardId } from "../../boardModel";
import { AllianceOverlay, BarrierOverlay, BlockOverlay, CounterOverlay, EvadeOverlay } from "../../overlay";
import type { CombatWindows } from "../model/combatWindows";

export function CombatWindowPrompts({
  state,
  blockWindow,
  counterWindow,
  allianceWindow,
  evadeWindow,
  barrierWindow,
  onBlock,
  onCounter,
  onAlliance,
  onEvade,
  onBarrier,
}: {
  state: GameState;
  blockWindow: CombatWindows["blockWindow"];
  counterWindow: CombatWindows["counterWindow"];
  allianceWindow: CombatWindows["allianceWindow"];
  evadeWindow: CombatWindows["evadeWindow"];
  barrierWindow: CombatWindows["barrierWindow"];
  /** No blocker means the viewer declined. */
  onBlock: (blockerPermanentId?: string) => void;
  /** No effect means the viewer passed. */
  onCounter: (instanceId?: string, effectKey?: string) => void;
  /** No ally means the viewer passed. */
  onAlliance: (allyPermanentId?: string) => void;
  onEvade: (permanentId: string, accept: boolean) => void;
  onBarrier: (permanentId: string, accept: boolean) => void;
}) {
  return (
    <>
      {blockWindow ? (
        <BlockOverlay
          attackerCardId={permCardId(state, blockWindow.attackerPermanentId)}
          blockers={blockWindow.eligibleBlockerIds.map((pid) => ({
            permanentId: pid,
            cardId: permCardId(state, pid) ?? "",
            currentDP: findPermanentInState(state, pid)?.currentDP ?? 0,
            sourceCount: findPermanentInState(state, pid)?.stack.length ?? 0,
          }))}
          mustBlock={blockWindow.mustBlock}
          onBlock={(pid) => onBlock(pid)}
          onDecline={() => onBlock()}
        />
      ) : null}

      {counterWindow ? (
        <CounterOverlay
          attackerCardId={permCardId(state, counterWindow.attackerPermanentId)}
          eligibleCounters={counterWindow.eligibleCounters}
          getCardId={(instanceId) => instanceCardId(state, instanceId)}
          onActivate={(instanceId, effectKey) => onCounter(instanceId, effectKey)}
          onPass={() => onCounter()}
        />
      ) : null}

      {allianceWindow ? (
        <AllianceOverlay
          triggerCardId={permCardId(state, allianceWindow.permanentId)}
          allies={allianceWindow.eligibleAllyIds.map((pid) => {
            const permanent = findPermanentInState(state, pid);
            return {
              permanentId: pid,
              cardId: permanent?.topCard?.cardId ?? "",
              currentDP: permanent?.currentDP ?? 0,
              sourceCount: permanent?.stack.length ?? 0,
            };
          })}
          onChoose={(allyPid) => onAlliance(allyPid)}
          onPass={() => onAlliance()}
        />
      ) : null}

      {evadeWindow ? (
        <EvadeOverlay
          permanentId={evadeWindow.permanentId}
          getCardId={(pid) => permCardId(state, pid)}
          onAccept={() => onEvade(evadeWindow.permanentId, true)}
          onDecline={() => onEvade(evadeWindow.permanentId, false)}
        />
      ) : null}

      {barrierWindow ? (
        <BarrierOverlay
          permanentId={barrierWindow.permanentId}
          getCardId={(pid) => permCardId(state, pid)}
          onAccept={() => onBarrier(barrierWindow.permanentId, true)}
          onDecline={() => onBarrier(barrierWindow.permanentId, false)}
        />
      ) : null}
    </>
  );
}
