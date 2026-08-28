import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-030.js";

describe("BT4-030 Beowolfmon", () => {
  it("cannot be attacked on the opponent's turn with a Hybrid card underneath", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-030", as: "beowolfmon", under: ["BT4-016"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("beowolfmon"), "cantBeAttacked")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("beowolfmon").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("does not prevent attacks without a Hybrid card or blue Tamer underneath", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-030", as: "beowolfmon", under: ["BT4-029"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("beowolfmon"), "cantBeAttacked")).toBe(false);
  });

  it("also recognizes a blue Tamer in the evolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-030", as: "beowolfmon", under: ["BT4-093"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("beowolfmon"), "cantBeAttacked")).toBe(true);
  });
});
