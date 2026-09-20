/* The five questions combat itself asks: block, counter, alliance, evade and barrier.

   Each is a question for this seat exactly as a `pendingDecision` is, but it answers
   through its own intent rather than the decision channel, and the server never opens
   one while a decision is unanswered — so at most one of these is ever on screen. */

import type { GameState } from "@aegis/shared";
import { instanceCardId, permCardId } from "../../decisionModel";
import { BarrierOverlay, CounterOverlay, EvadeOverlay } from "../../overlay";
import { BoardAlliancePrompt, BoardBlockPrompt } from "../../BoardDecisionRail";
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
  counterSelection,
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
  counterSelection?: {
    instanceId?: string;
    targetPermanentId?: string;
    onSelect: (instanceId?: string) => void;
    handInstanceIds: readonly string[];
  };
}) {
  return (
    <>
      {blockWindow ? (
        <BoardBlockPrompt
          attackerCardId={permCardId(state, blockWindow.attackerPermanentId)}
          mustBlock={blockWindow.mustBlock}
          onDecline={() => onBlock()}
        />
      ) : null}

      {counterWindow ? (
        <CounterOverlay
          attackerCardId={permCardId(state, counterWindow.attackerPermanentId)}
          eligibleCounters={counterWindow.eligibleCounters}
          selectedInstanceId={counterSelection?.instanceId}
          selectedTargetPermanentId={counterSelection?.targetPermanentId}
          onSelectInstance={counterSelection?.onSelect ?? (() => undefined)}
          handInstanceIds={counterSelection?.handInstanceIds ?? []}
          getCardId={(instanceId) => instanceCardId(state, instanceId)}
          getPermanentCardId={(permanentId) => permCardId(state, permanentId)}
          onActivate={(instanceId, effectKey) => onCounter(instanceId, effectKey)}
          onPass={() => onCounter()}
        />
      ) : null}

      {allianceWindow ? (
        <BoardAlliancePrompt
          attackerCardId={permCardId(state, allianceWindow.permanentId)}
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
