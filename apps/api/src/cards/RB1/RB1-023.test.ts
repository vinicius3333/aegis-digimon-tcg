import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-023 Ghilliedhumon", () => {
  it("suspends one opponent Digimon at or below its DP and prevents unsuspension", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-023", as: "ghillie", under: [{ card: "RB1-005" }] }] },
        1: {
          battleArea: [
            { card: "EX2-045", as: "eligible" },
            { card: "RB1-024", as: "tooLarge" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ghillie"));
    await settle(() => s.perm("eligible").isSuspended);

    expect(s.perm("eligible").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("eligible"), "unsuspend")).toBe(true);
    expect(s.perm("tooLarge").isSuspended).toBe(false);
  });

  it("does not suspend an opponent Digimon above its DP limit", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-023", as: "ghillie" }] },
      1: { battleArea: [{ card: "RB1-024", as: "tooLarge" }] },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ghillie"));

    expect(s.perm("tooLarge").isSuspended).toBe(false);
  });
});
