import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-033.js";
import "./EX2-037.js";

describe("EX2-033 Locomon", () => {
  it("reduces the cost to digivolve into GroundLocomon by 1", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX2-033", as: "base" }], hand: [{ card: "EX2-036", as: "evolution" }] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 8);
    expect(s.state.memory).toBe(8);
  });

  it("does not reduce a digivolution into a different level-6 Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX2-033", as: "base" }], hand: [{ card: "EX2-037", as: "evolution" }] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 6);
    expect(s.state.memory).toBe(6);
  });
});
