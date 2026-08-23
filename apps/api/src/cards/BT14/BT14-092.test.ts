import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-092.js";

describe("BT14-092", () => {
  it("restricts up to three opposing Digimon with no more digivolution cards than the chosen one", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main" });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "SelectBind",
      target: { bindAs: "chosenDigimon" },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Restrict",
      restriction: "attackOrBlock",
      duration: "untilOpponentTurnEnd",
      target: { count: 3 },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      target: { filter: { relativeTo: { attr: "digivolutionCount", op: "lte", selectionRef: "chosenDigimon" } } },
    });
  });

  it("restricts one opposing Digimon from attacking in security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "Restrict", restriction: "attack" }, { kind: "AddToHandSelf" }],
    });
  });
});
