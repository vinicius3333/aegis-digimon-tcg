import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("ST10-10 Wizardmon", () => {
  it("digivolves as the vanilla purple/yellow level 4 card without opening an effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST10-07", as: "base" }], hand: [{ card: "ST10-10", as: "wizardmon" }] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("wizardmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST10-10");

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["ST10-07"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
