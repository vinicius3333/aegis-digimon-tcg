import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-030.js";

describe("BT5-030 Neptunemon", () => {
  it("can't be targeted by an opponent's attack during their turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-030", as: "neptunemon", suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("neptunemon"), "cantBeAttacked")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("neptunemon").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });
});
