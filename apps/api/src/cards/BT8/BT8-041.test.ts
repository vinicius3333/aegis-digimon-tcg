import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT8-041 Kyukimon", () => {
  it("matches its official effectless metadata and plays normally", async () => {
    expect(getCardDefinition("BT8-041")).toMatchObject({
      nameEn: "Kyukimon",
      colors: ["Yellow", "Purple"],
      level: 5,
      playCost: 7,
      dp: 9000,
      types: ["Mysterious Beast"],
    });
    const s = setupEngine({ 0: { hand: [{ card: "BT8-041", as: "card" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
