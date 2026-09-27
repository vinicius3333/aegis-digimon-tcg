import type { Seat, ServerEvent } from "@aegis/shared";
import type { GameEngine } from "../../engine/GameEngine.js";
import type { TrainingWindow } from "./policy.js";

export interface TrainingForfeit {
  kind: "unaffordablePaymentRefusal";
  sourceInstanceId: string;
}

/** Training-only terminal penalty. Evaluation never installs this controller. */
export function costRefusalForfeit(engine: GameEngine, seat: Seat, record: (failure: TrainingForfeit) => void) {
  let playInstanceId: string | undefined;
  let refused = false;
  let forfeited = false;
  let playTurn = -1;
  return {
    observeChoice(window: TrainingWindow, index: number): void {
      const intent = window.actions[index]?.intent;
      if (window.kind === "main") {
        playInstanceId = intent?.type === "playCard" ? intent.instanceId : undefined;
        refused = false;
        playTurn = engine.state.turnCount;
      }
      const request = window.request;
      const residentPayment =
        request?.seat === seat &&
        request.options?.timing === "BeforePayCost" &&
        request.decisionId === engine.state.pendingDecision?.decisionId &&
        engine.state.players[seat]?.battleArea.some(
          (unit) =>
            unit.permanentId === request.sourcePermanentId && unit.topCard.instanceId === request.sourceInstanceId,
        );
      if (
        playInstanceId === undefined ||
        !engine.payingPlayCost ||
        (request?.sourceInstanceId !== playInstanceId && !residentPayment) ||
        intent?.type !== "respondDecision"
      )
        return;
      const response = intent.response;
      if (
        (response.kind === "optional" && !response.accept) ||
        ((response.kind === "chooseTargets" || response.kind === "selectCards") &&
          response.instanceIds.length === 0 &&
          window.selected.length === 0)
      )
        refused = true;
    },
    onEngineRejection(event: Extract<ServerEvent, { kind: "actionRejected" }>): void {
      if (
        forfeited ||
        !refused ||
        playInstanceId === undefined ||
        engine.state.gameOver ||
        engine.state.turnSeat !== seat ||
        engine.state.turnCount !== playTurn ||
        engine.mainVerbContinuationsInFlight === 0 ||
        event.intent !== "playCard" ||
        event.reason !== "insufficient-memory" ||
        !engine.state.players[seat]?.hand.some((card) => card.instanceId === playInstanceId)
      )
        return;
      forfeited = true;
      record({ kind: "unaffordablePaymentRefusal", sourceInstanceId: playInstanceId });
      const result = engine.applyIntent(seat, { type: "surrender" });
      if (!result.ok) throw new Error("Training payment-forfeit surrender failed");
    },
  };
}
