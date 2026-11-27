import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";

const board = {
  0: { hand: ["BT27-053"], deck: ["BT27-053", "BT27-053"] },
  1: { deck: ["BT27-053", "BT27-053"] },
} as const;

function turnEnded(events: readonly { kind: string }[]): boolean {
  return events.some((event) => event.kind === "turnEnded");
}

function mainPhaseOf(engine: unknown): { isOpen: boolean } {
  return (engine as { mainPhase: { isOpen: boolean } }).mainPhase;
}

describe("a turn whose player has no legal action", () => {
  it("ends on its own when the engine runs without the live-room option", async () => {
    const s = setupEngine(board);
    s.state.memory = 0;
    await s.ready();

    await s.engine.runOneTurn();

    expect(turnEnded(s.events)).toBe(true);
  });

  it("stays in Main until the player ends it when live rooms keep the turn open", async () => {
    const s = setupEngine(board, { keepTurnOpenWithoutActions: true });
    s.state.memory = 0;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await settle(() => mainPhaseOf(s.engine).isOpen);
    await settle(() => false, 20);

    expect(turnEnded(s.events)).toBe(false);
    expect(s.state.phase).toBe(Phase.Main);
    expect(mainPhaseOf(s.engine).isOpen).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(turnEnded(s.events)).toBe(true);
  });
});
