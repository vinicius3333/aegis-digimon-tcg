import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";

/**
 * Run seat 0's turn up to an open Main phase, so its [Start of Your Main Phase] effects have
 * resolved, hand the board to `inspect`, then end the turn. `accept` answers every "you may"
 * prompt of the turn.
 */
export async function runTurnThroughMainStart(
  board: BoardSpec,
  accept: boolean,
  inspect: (s: EngineSetup) => void,
): Promise<void> {
  const s = setupEngine(
    board,
    accept ? { autoAcceptOptional: true, autoSelectCards: true } : { autoDeclineOptional: true, autoSelectCards: true },
  );
  s.state.isFirstPlayersFirstTurn = false;
  s.state.memory = 3;
  await s.ready();
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  inspect(s);
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
}

export const cardIdsIn = (cards: Iterable<{ cardId: string }>) => Array.from(cards, (card) => card.cardId);

export const battleAreaCardIds = (s: EngineSetup) =>
  s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId);
