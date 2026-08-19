import { describe, expect, it } from "vitest";
import { compiled as BT25_001 } from "./BT25-001.js";
import "../index.js";

describe("BT25-001 Bibimon", () => {
  it("draws when this Digimon has the TS trait", () => {
    const effect = BT25_001.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      condition: {
        kind: "selfHasTrait",
        filter: { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
      },
    });
  });
});
