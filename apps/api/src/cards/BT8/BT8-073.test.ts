import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT8-073 Mushroomon", () => {
  it("matches its official effectless metadata and plays normally", async () => {
    expect(getCardDefinition("BT8-073")).toMatchObject({
      nameEn: "Mushroomon",
      colors: ["Purple"],
      level: 3,
      playCost: 3,
      dp: 4000,
      types: ["Vegetation"],
    });
    const s = setupEngine({ 0: { hand: [{ card: "BT8-073", as: "card" }] } });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
