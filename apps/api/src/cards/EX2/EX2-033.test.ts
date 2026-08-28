import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-033.js";

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
});
