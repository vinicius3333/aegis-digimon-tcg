import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT8-017 UltimateBrachiomon", () => {
  it("matches its official dual-color effectless metadata and plays normally", async () => {
    expect(getCardDefinition("BT8-017")).toMatchObject({
      nameEn: "UltimateBrachiomon",
      colors: ["Red", "Black"],
      level: 6,
      playCost: 10,
      dp: 13000,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Cyborg", "X Antibody"],
    });
    const s = setupEngine({ 0: { hand: [{ card: "BT8-017", as: "card" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
