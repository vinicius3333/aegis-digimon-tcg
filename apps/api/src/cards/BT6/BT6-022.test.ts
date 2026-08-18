import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-022.js";

describe("BT6-022 Strabimon", () => {
  it("gains 1 memory when its Hybrid host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-049", under: ["BT6-022"], as: "hybrid" }] },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("hybrid").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });
});
