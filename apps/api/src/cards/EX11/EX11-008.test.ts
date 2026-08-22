import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-008.js";
import "../index.js";

describe("EX11-008 Elizamon", () => {
  it("gives a Reptile or Dragonkin Digimon Raid and +3000 DP on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-007", as: "target" }], hand: [{ card: "EX11-008", as: "elizamon" }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("elizamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Raid")).toBe(true);
  });
});
