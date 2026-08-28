import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-014.js";

describe("P-014 Kurisarimon", () => {
  it("has Blocker and loses exactly 2 memory when it attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-014", as: "kurisarimon" }] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 5;
    await s.ready();

    expect([...s.perm("kurisarimon").keywords]).toContain("Blocker");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kurisarimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);

    expect(s.state.memory).toBe(3);
  });
});
