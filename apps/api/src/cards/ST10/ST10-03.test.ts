import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("ST10-03 Lopmon", () => {
  it("digivolves as the vanilla yellow level 3 card without opening an effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST10-02", as: "base" }], hand: [{ card: "ST10-03", as: "lopmon" }] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("lopmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST10-03");

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["ST10-02", "ST10-03"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
