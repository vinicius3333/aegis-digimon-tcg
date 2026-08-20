import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-035.js";

describe("BT15-035", () => {
  it("may trash Numemon/Sukamon from hand to give an opposing Digimon Security Attack -1", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "untilOpponentTurnEnd", cost: { kind: "trash" }, optional: true });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "GainKeyword", keyword: { amount: -1 } }] });
  });
  it("also grants the same inherited attack reduction and the Numemon rule name", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Numemon"] }] });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }] });
  });
});
