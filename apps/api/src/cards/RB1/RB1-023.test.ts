import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-023 Ghilliedhumon", () => {
  it("suspends one opponent Digimon at or below its DP and prevents unsuspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-021", as: "base", under: [{ card: "RB1-005" }] }],
          hand: [{ card: "RB1-023", as: "ghillie" }],
        },
        1: {
          battleArea: [
            { card: "EX2-045", as: "eligible" },
            { card: "RB1-024", as: "tooLarge" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ghillie").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("eligible").isSuspended);

    expect(s.perm("eligible").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("eligible"), "unsuspend")).toBe(true);
    expect(s.perm("tooLarge").isSuspended).toBe(false);
  });

  it("does not suspend an opponent Digimon above its DP limit", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-021", as: "base" }], hand: [{ card: "RB1-023", as: "ghillie" }] },
      1: { battleArea: [{ card: "RB1-024", as: "tooLarge" }] },
    });

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ghillie").instanceId,
      }),
    ).toEqual({ ok: true });

    expect(s.perm("tooLarge").isSuspended).toBe(false);
  });
});
