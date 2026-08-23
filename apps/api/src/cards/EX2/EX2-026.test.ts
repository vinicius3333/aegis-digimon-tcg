import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-026.js";

describe("EX2-026 Gargomon", () => {
  it("reduces its digivolution cost by 1 with a green Tamer in play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX2-026", as: "base" }, "EX2-061"], hand: [{ card: "EX2-027", as: "evolution" }] } },
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
