import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-028.js";

describe("P-028 Pulsemon", () => {
  it("draws with three or more security cards", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-028", as: "pulsemon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
        security: ["BT1-028", "BT1-028", "BT1-028", "BT1-028"],
      },
    });
    const p0 = s.state.players[0]!;
    const drawn = s.inst("drawn").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pulsemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.hand.some((card) => card.instanceId === drawn));
    expect(p0.hand.some((card) => card.instanceId === drawn)).toBe(true);
  });

  it("gains memory with three or fewer security cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-028", as: "pulsemon" }], security: ["BT1-028", "BT1-028"] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pulsemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("does both effects at exactly three security cards", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-028", as: "pulsemon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
        security: ["BT1-028", "BT1-028", "BT1-028"],
      },
    });
    const p0 = s.state.players[0]!;
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pulsemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.hand.some((card) => card.instanceId === s.inst("drawn").instanceId) && s.state.memory === 2);
    expect(p0.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });
});
