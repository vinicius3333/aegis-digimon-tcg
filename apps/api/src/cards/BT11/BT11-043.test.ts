import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-043.js";

describe("BT11-043 KingSukamon", () => {
  it("replaces an opponent Digimon's original name, color and DP", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT11-043", as: "king" }], trash: ["BT11-040", "BT11-040", "BT11-040"] },
      1: { battleArea: [{ card: "ST15-11", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 20;
    const target = s.perm("target");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => target.currentDP === 3000);

    expect(observe(s.engine).effectiveNames(target)).toEqual(["sukamon"]);
    expect(observe(s.engine).effectiveColors(target)).toEqual(["White"]);
    expect(target.currentDP).toBe(3000);
  });

  it("does nothing when neither trash condition is met", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT11-043", as: "king" }] },
      1: { battleArea: [{ card: "ST15-11", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 20;
    const target = s.perm("target");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT11-043"));

    expect(observe(s.engine).effectiveNames(target)).toEqual(["metalgreymon"]);
    expect(observe(s.engine).effectiveColors(target)).toEqual(["Black"]);
    expect(target.currentDP).toBe(8000);
  });
});
