import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST12-03 Solarmon", () => {
  it("prevents both players from reducing play costs", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST12-03", "BT1-027"], hand: [{ card: "ST9-09", as: "stingmon" }] } });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("stingmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.memory).toBe(0);
  });

  it("also prevents the opponent from reducing a play cost", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT1-027"], hand: [{ card: "ST9-09", as: "stingmon" }] },
      1: { battleArea: ["ST12-03"] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("stingmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(0);
  });
});
