import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT8-027 Scorpiomon", () => {
  it("matches its official effectless metadata and plays normally", async () => {
    expect(getCardDefinition("BT8-027")).toMatchObject({
      nameEn: "Scorpiomon",
      colors: ["Blue"],
      level: 5,
      playCost: 7,
      dp: 8000,
      types: ["Ancient Crustacean"],
    });
    const s = setupEngine({ 0: { hand: [{ card: "BT8-027", as: "card" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
