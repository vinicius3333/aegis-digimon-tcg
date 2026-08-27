import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled } from "./BT16-094.js";

describe("BT16-094", () => {
  it("models Delay and reveals Four Great Dragons or yellow cards", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom" }, { kind: "PlaceInBattleAreaSelf" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        { kind: "Modal", choose: 1 },
        { kind: "ModifyDP", amount: -7000, duration: "forTheTurn", condition: { kind: "ifThisEffectActed" } },
      ],
    });
    expect(irNode(compiled.effects?.[1]?.actions?.[0])?.options?.[0]?.[0]).not.toHaveProperty("optional");
  });

  it("reduces an opponent by 7000 and places itself from security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ModifyDP", amount: -7000, duration: "forTheTurn" }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });
});
