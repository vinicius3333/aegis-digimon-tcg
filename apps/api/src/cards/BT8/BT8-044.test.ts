import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-044.js";

describe("BT8-044 Azulongmon", () => {
  it("may trash the top of its security to gain 2 memory when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-044", as: "azulongmon" }], security: ["BT8-034", "BT8-035"] },
      1: { security: ["BT8-034"] },
    }, { autoAcceptOptional: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("azulongmon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 5);
    expect(s.state.memory).toBe(5);
  });
});
