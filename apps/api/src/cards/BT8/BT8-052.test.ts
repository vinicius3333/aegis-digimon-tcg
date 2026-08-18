import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT8-052 Drimogemon", () => {
  it("matches its official effectless metadata and plays normally", async () => {
    expect(getCardDefinition("BT8-052")).toMatchObject({
      nameEn: "Drimogemon",
      colors: ["Green"],
      level: 4,
      playCost: 5,
      dp: 5000,
      types: ["Beast"],
    });
    const s = setupEngine({ 0: { hand: [{ card: "BT8-052", as: "card" }] } });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
