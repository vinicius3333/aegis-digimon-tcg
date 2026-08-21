import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-023.js";

describe("BT18-023 Lanamon", () => {
  it("keeps Aquatic as a Rule trait and preserves the reveal placement alternatives", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ count: 1, to: "hand", orDispositions: [{ to: "placeUnder", underFilter: { colors: ["Blue"] } }] }] }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({ trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] }] });
    expect(compiled.effects[3]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Return", to: "hand", target: { filter: { levels: [3] } } }] });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-023", as: "lanamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("lanamon"), "Aquatic")).toBe(true);
  });
});
