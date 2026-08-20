import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-020.js";

describe("BT15-020", () => {
  it("grants one Digimon Blocker and draws with Matt Ishida", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "youHave" } });
  });
  it("draws once per turn when attacking", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] }));
});
