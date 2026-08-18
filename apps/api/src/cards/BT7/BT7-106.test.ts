import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-106.js";

describe("BT7-106 Brave Metal", () => {
  it("deletes an opposing Digimon with play cost 6 or less", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT7-056"], hand: [{ card: "BT7-106", as: "option" }] },
      1: { battleArea: [{ card: "BT7-044", as: "target" }] },
    }, { autoSelectCards: true });
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("may use the loaded X-Antibody alternative to delete a higher-cost non-X Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{
          card: "BT7-056",
          under: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        }],
        hand: [{ card: "BT7-106", as: "option" }],
      },
      1: { battleArea: [{ card: "BT7-066", as: "highCostTarget" }] },
    }, { autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 });
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
