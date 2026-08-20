import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-049.js";

describe("BT15-049", () => {
  it("gives one of your Digimon +3000 DP and may redirect an attack on play or digivolving", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "ModifyDP", amount: 3000 }, { kind: "RedirectAttack", condition: { kind: "duringAttack" }, optional: true }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "ModifyDP", amount: 3000 }, { kind: "RedirectAttack" }] });
  });
  it("makes itself immune to opponent Digimon effects while suspended", () => expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "selfIsSuspended" } }] }));
});
