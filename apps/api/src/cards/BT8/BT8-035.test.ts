import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-035.js";

describe("BT8-035 Candlemon", () => {
  it("gains 1 memory when another purple Digimon is played", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT8-041", as: "host", under: ["BT8-035"] }],
      hand: [{ card: "BT8-073", as: "played" }],
    } });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 5 - 3 + 1);
    expect(s.state.memory).toBe(3);
  });
});
