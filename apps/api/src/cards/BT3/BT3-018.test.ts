import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-018.js";
describe("BT3-018 BlitzGreymon", () => {
  it("De-Digivolves an opponent by 2 and has Piercing", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: "BT3-018", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-020", under: ["BT2-013", "BT2-017"], as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.perm("target").topCard.cardId).toBe("BT2-013");
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
  });
});
