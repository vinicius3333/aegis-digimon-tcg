import { Phase, type GameState, type Seat } from "@aegis/shared";
import type { TranslationKey } from "../i18n";

const DECISION_STATUS: Record<string, TranslationKey> = {
  selectCards: "game.opponentIsSelecting",
  chooseTargets: "game.opponentIsTargeting",
  optional: "game.opponentIsDecidingEffect",
  orderTriggers: "game.opponentIsOrdering",
  orderCards: "game.opponentIsOrdering",
  chooseOption: "game.opponentIsChoosingOption",
  mulligan: "game.opponentIsMulligan",
};

/**
 * What the viewer is waiting on the opponent for, or nothing when the viewer
 * acts next. Decision and combat-window seats and decision kinds are public
 * synchronized state; only their payloads are view-gated, so this never says
 * which cards are involved.
 */
export function opponentStatusKey(state: GameState, viewerSeat: Seat): TranslationKey | null {
  if (state.gameOver) return null;
  const decision = state.pendingDecision;
  if (decision) {
    if (decision.seat === viewerSeat) return null;
    return DECISION_STATUS[decision.kind] ?? "game.opponentIsThinking";
  }
  const combat = state.combatWindow;
  if (combat) return combat.seat === viewerSeat ? null : "game.opponentIsResponding";
  const openTurn = state.phase === Phase.Main || state.phase === Phase.Breeding;
  return openTurn && state.turnSeat !== viewerSeat ? "game.opponentIsThinking" : null;
}
