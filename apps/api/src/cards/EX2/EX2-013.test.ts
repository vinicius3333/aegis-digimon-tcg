import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-013.js";
import "../BT1/BT1-032.js";

describe("EX2-013 Labramon", () => {
  it("gains 1 memory when its Jamming host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-032", as: "host", under: ["EX2-013"] }] },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4);
    expect(s.state.memory).toBe(4);
  });
});
