import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-029.js";

describe("EX2-029 MegaGargomon", () => {
  it("suspends and prevents unsuspension of one opposing Digimon per green Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-027", as: "base" }, "EX2-061", "EX2-061"],
          hand: [{ card: "EX2-029", as: "evolution" }],
        },
        1: {
          battleArea: [
            { card: "EX2-014", as: "one" },
            { card: "EX2-019", as: "two" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("one"), "unsuspend") &&
        observe(s.engine).isRestricted(s.perm("two"), "unsuspend"),
    );
    expect(s.perm("one").isSuspended).toBe(true);
    expect(s.perm("two").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("one"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("two"), "unsuspend")).toBe(true);
  });
});
