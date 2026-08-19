import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT25-102 Factorial Area", () => {
  it("places itself face up at the bottom of security after taking the top card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-102", as: "area" }],
          security: [{ card: "BT25-001", as: "topSecurity" }, { card: "BT25-002" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const areaId = s.inst("area").instanceId;
    const topSecurityId = s.inst("topSecurity").instanceId;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: areaId,
      useAs: "option",
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === areaId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === topSecurityId)).toBe(true);
    expect(s.state.players[0]!.security.find((card) => card.instanceId === areaId)).toMatchObject({
      instanceId: areaId,
      faceUp: true,
    });
  });
});
