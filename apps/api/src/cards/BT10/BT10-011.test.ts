import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-011.js";

// BT10-011 Canoweissmon — documented behavior: the card behavior source
//   "[Your Turn][Once Per Turn] WHEN ONE OF YOUR TAMERS BECOMES SUSPENDED, this Digimon
//    gets +2000 DP for the turn. Then, if this Digimon has 12000 DP or more, it gains
//    <Security Attack +1> for the turn."
// The documented behavior routes this through EffectTiming.OnTappedAnyone, gated by
// that fires the moment a controlled Tamer suspends, not a passive/static buff.
//
// Q1938 (2024-03-28): even if multiple Tamers suspend at the same time the +2000 DP only
// applies once — confirming it is a single suspend-triggered activation.
//
// runtime record IR divergence: the effect was emitted with trigger "YourTurn"
// (frequency OncePerTurn). timingForTrigger() maps "YourTurn" to EffectTiming.None (the
// continuous/static window), so the engine treats the DP gain as a passive modifier and
// it is NEVER reachable at the Tamer-suspend event. This file pins the correct home.

describe("BT10-011 Canoweissmon [Your Turn] suspend trigger", () => {
  it("encodes both the suspend trigger and Gammamon effect conferral in IR", () => {
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "YourTurn", frequency: "OncePerTurn" }),
      expect.objectContaining({ trigger: "AllTurns", actions: [expect.objectContaining({ kind: "GrantStatic", grant: "effects" })] }),
    ]));
  });

  it("ignores an opponent's Tamer becoming suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-011", as: "canoweissmon" }] },
      1: { battleArea: [{ card: "BT10-087", as: "opponentTamer" }] },
    });
    const baseDP = s.perm("canoweissmon").baseDP;

    await advance(s.engine).verb.suspend([s.perm("opponentTamer").permanentId]);

    expect(s.perm("canoweissmon").currentDP).toBe(baseDP);
    expect(observe(s.engine).keywordAmount(s.perm("canoweissmon"), "SecurityAttack")).toBe(0);
  });

  it("gains only +2000 DP when two of your Tamers suspend together (Q1938)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-011", as: "canoweissmon" },
          { card: "BT10-087", as: "firstTamer" },
          { card: "BT10-087", as: "secondTamer" },
        ],
      },
    });
    const baseDP = s.perm("canoweissmon").baseDP;

    await advance(s.engine).verb.suspend([
      s.perm("firstTamer").permanentId,
      s.perm("secondTamer").permanentId,
    ]);

    expect(s.perm("canoweissmon").currentDP).toBe(baseDP + 2000);
    expect(observe(s.engine).keywordAmount(s.perm("canoweissmon"), "SecurityAttack")).toBe(0);
  });

  it("does not double-count the bonus when checking the 12000 DP threshold", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-011", as: "canoweissmon", dp: 9000 },
          { card: "BT10-087", as: "tamer" },
        ],
      },
    });

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);

    expect(s.perm("canoweissmon").currentDP).toBe(11_000);
    expect(observe(s.engine).keywordAmount(s.perm("canoweissmon"), "SecurityAttack")).toBe(0);
  });

  it("grants Security Attack +1 when the suspend bonus reaches exactly 12000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-011", as: "canoweissmon", dp: 10_000 },
          { card: "BT10-087", as: "tamer" },
        ],
      },
    });

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);

    expect(s.perm("canoweissmon").currentDP).toBe(12_000);
    expect(observe(s.engine).keywordAmount(s.perm("canoweissmon"), "SecurityAttack")).toBe(1);
  });
});
