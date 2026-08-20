import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-054.js";

describe("BT16-054", () => {
  it("can return three D-Brigade or DigiPolice cards from trash to gain Rush", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Rush" }, duration: "forTheTurn", optional: true, abortOnDecline: true, cost: { kind: "return", target: { count: 3 } } });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Restrict", restriction: "cantBeBlocked", duration: "forTheTurn" });
    }
  });

  it("gives other D-Brigade or DigiPolice Digimon inherited DP", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { count: "all" } }] });
  });
});
