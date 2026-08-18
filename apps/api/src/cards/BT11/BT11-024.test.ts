import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-024.js";

describe("BT11-024 Penguinmon", () => {
  it("accepts a non-blue Sea Animal as the optional placement cost and draws", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT11-024", as: "penguinmon" },
          { card: "BT15-068", as: "seaAnimal" },
        ],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 9;
    const sourceInstanceId = s.inst("penguinmon").instanceId;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: sourceInstanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard, stack }) =>
      topCard?.instanceId === sourceInstanceId && stack.length === 1
    ) && s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));
    const penguinmon = s.state.players[0]!.battleArea.find(({ topCard }) =>
      topCard?.instanceId === sourceInstanceId
    )!;

    expect(penguinmon.stack[0]?.instanceId).toBe(s.inst("seaAnimal").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
  });
});
