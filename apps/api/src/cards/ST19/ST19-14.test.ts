import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./ST19-14.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("ST19-14 Arisa Kinosaki", () => {
  it("matches memory, Puppet/Token Rush, and Security play wording", () => {
    const card = getCardDefinition("ST19-14");
    expect(card.effectText).toContain("set your memory to 3");
    expect(card.effectText).toContain("gains ＜Rush＞");
    expect(card.securityEffectText).toBe("[Security] Play this card without paying the cost.");
  });

  it("sets memory to 3 at the start of turn when memory is 2", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST19-14", as: "arisa" }] }, 1: {} });
    s.state.memory = 2;
    s.state.phase = "Main" as never;
    void s.engine.runOneTurn();
    await settle(() => s.state.memory === 3, 100);
    expect(s.state.memory).toBe(3);
  });
});
