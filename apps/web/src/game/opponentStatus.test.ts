import { describe, expect, it } from "vitest";
import { CombatWindow, GameState, PendingDecision, Phase } from "@aegis/shared";
import { opponentStatusKey } from "./opponentStatus";

function stateWith(configure: (state: GameState) => void): GameState {
  const state = new GameState();
  state.phase = Phase.Main;
  state.turnSeat = 0;
  configure(state);
  return state;
}

function decision(seat: 0 | 1, kind: string): PendingDecision {
  return Object.assign(new PendingDecision(), { decisionId: "d", seat, kind });
}

describe("opponentStatusKey", () => {
  it("names the kind of the opponent's open decision", () => {
    const cases = {
      selectCards: "game.opponentIsSelecting",
      chooseTargets: "game.opponentIsTargeting",
      optional: "game.opponentIsDecidingEffect",
      orderTriggers: "game.opponentIsOrdering",
      chooseOption: "game.opponentIsChoosingOption",
      mulligan: "game.opponentIsMulligan",
      somethingNew: "game.opponentIsThinking",
    };
    for (const [kind, key] of Object.entries(cases)) {
      expect(
        opponentStatusKey(
          stateWith((state) => (state.pendingDecision = decision(1, kind))),
          0,
        ),
      ).toBe(key);
    }
  });

  it("stays quiet while the viewer must answer", () => {
    expect(
      opponentStatusKey(
        stateWith((state) => (state.pendingDecision = decision(0, "optional"))),
        0,
      ),
    ).toBeNull();
    const ownBlock = stateWith((state) => {
      state.turnSeat = 1;
      state.combatWindow = Object.assign(new CombatWindow(), { kind: "block", seat: 0 });
    });
    expect(opponentStatusKey(ownBlock, 0)).toBeNull();
  });

  it("reports the opponent's block window during the viewer's attack", () => {
    const block = stateWith(
      (state) => (state.combatWindow = Object.assign(new CombatWindow(), { kind: "block", seat: 1 })),
    );
    expect(opponentStatusKey(block, 0)).toBe("game.opponentIsResponding");
  });

  it("reads the opponent's open turn as thinking, and nothing once the game ends", () => {
    for (const phase of [Phase.Breeding, Phase.Main]) {
      expect(
        opponentStatusKey(
          stateWith((state) => ((state.turnSeat = 1), (state.phase = phase))),
          0,
        ),
      ).toBe("game.opponentIsThinking");
    }
    expect(
      opponentStatusKey(
        stateWith((state) => ((state.turnSeat = 1), (state.phase = Phase.Draw))),
        0,
      ),
    ).toBeNull();
    expect(
      opponentStatusKey(
        stateWith(() => undefined),
        0,
      ),
    ).toBeNull();
    const over = stateWith((state) => ((state.turnSeat = 1), (state.gameOver = true)));
    expect(opponentStatusKey(over, 0)).toBeNull();
  });
});
