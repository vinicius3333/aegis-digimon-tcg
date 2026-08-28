import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-057.js";

describe("BT4-057 GrapLeomon", () => {
  it("gains 1 memory when attacking from a legal green stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-057", as: "grap", under: ["BT4-004", "BT4-052", "BT4-054"] }] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("grap").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});
