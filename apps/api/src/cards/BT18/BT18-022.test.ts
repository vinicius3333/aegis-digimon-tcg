import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-022.js";

describe("BT18-022 Kumamon", () => {
  it("keeps the Ice-Snow Rule trait and all timing-specific effect boundaries", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "TrashDigivolution", amount: 2, fromTop: false }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Digivolve", reduceCost: 1, into: { colors: ["Red", "Blue"], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] } }] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Ice-Snow"] }] });
    expect(compiled.effects[3]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Replacement", event: "wouldLeavePlay", leaveCause: "otherThanYourEffect" }] });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-022", as: "kumamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("kumamon"), "Ice-Snow")).toBe(true);
  });
});
