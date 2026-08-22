import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-087.js";

describe("BT17-087 Marcus Damon", () => {
  it("turns one Marcus Damon into a temporary 3000-DP Blocker that cannot digivolve", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "GrantStatic", grant: "kinds", tokens: ["Digimon"], duration: "untilOpponentTurnEnd" },
        { kind: "SetBaseDP", value: 3000, duration: "untilOpponentTurnEnd" },
        { kind: "Restrict", restriction: "digivolve", duration: "untilOpponentTurnEnd" },
        { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
      ],
    });
  });

  it("resolves both All Turns effects only when this Tamer suspends", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "ModifyDP", amount: 3000, duration: "forTheTurn" },
        { kind: "GainMemory", amount: 1, condition: { kind: "youHave" } },
      ],
    });
  });

  it("plays itself from Security without paying its cost", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }] });
  });
});
