import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-036.js";

describe("BT15-036", () => {
  it("may trash security to give an opposing Digimon -6000 DP on play or deletion", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "ModifyDP", amount: -6000, duration: "untilOpponentTurnEnd", cost: { kind: "trash" }, optional: true }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "ModifyDP", amount: -6000, cost: { kind: "trash" } }] });
  });
});
