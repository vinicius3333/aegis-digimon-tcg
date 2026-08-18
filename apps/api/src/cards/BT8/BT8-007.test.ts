import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT8-007 Gazimon", () => {
  it("matches its official effectless metadata and plays normally", async () => {
    expect(getCardDefinition("BT8-007")).toMatchObject({ nameEn: "Gazimon", colors: ["Red"], level: 3, playCost: 2, dp: 3000, forms: ["Rookie"], attributes: ["Virus"], types: ["Mammal"] });
    const s = setupEngine({ 0: { hand: [{ card: "BT8-007", as: "card" }] } });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
