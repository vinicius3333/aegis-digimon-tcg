import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-001.js";
import "../ST7/ST7-06.js";

describe("BT12-001 Gigimon", () => {
  it("raises an owner's printed DP-deletion ceiling by 1000", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", under: ["BT12-001"] }],
        hand: [{ card: "ST7-06", as: "removal" }],
      },
      1: { battleArea: [{ card: "BT12-038", as: "target", dp: 5000 }] },
    }, { autoSelectCards: true });
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not apply outside the inherited effect's owner's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", dp: 5000, under: ["BT12-001"] }], security: 1 },
      1: { battleArea: [{ card: "BT12-038", as: "target", dp: 5000 }], hand: [{ card: "ST7-06", as: "removal" }] },
    }, { autoSelectCards: true });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ cardId }) => cardId === "ST7-06"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
