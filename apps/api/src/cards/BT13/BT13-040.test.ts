import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-040.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-040 Magnamon", () => {
  it("keeps Blocker and replaces leaving play with draw plus optional Veemon play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Blocker" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", actions: [expect.objectContaining({ kind: "Replacement", event: "wouldLeavePlay" }), expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand", "digivolutionCards"], optional: true })] });
  });

  it("exposes Blocker on the live Magnamon permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-040", as: "magna" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("magna"), "Blocker")).toBe(true);
  });
});
