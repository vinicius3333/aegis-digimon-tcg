import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST7-07.js";

describe("ST7-07 RizeGreymon", () => {
  it("deletes an opposing Digimon with 5000 DP or less on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST7-07", as: "rize" }] }, 1: { battleArea: ["ST7-06"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rize").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
  });
});
