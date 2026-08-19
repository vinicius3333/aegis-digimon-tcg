import { describe, expect, it } from "vitest";
import { compiled as BT25_014 } from "./BT25-014.js";
import "../index.js";

describe("BT25-014 Meramon", () => {
  it("requires trashing a Flame/TS hand card for the delete and draws only when no deletion occurred", () => {
    const main = BT25_014.effects?.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ frequency: "OncePerTurn" });
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
      cost: { kind: "trash", target: { filter: { controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["Flame", "TS"], match: "trait" }] }, count: 1 } },
    });
    expect(main?.actions?.[1]).toMatchObject({ kind: "Draw", controller: "mine", amount: 2, condition: { kind: "ifThisEffectDidNotDelete" } });
  });

  it("preserves the inherited 4000 DP deletion", () => {
    const inherited = BT25_014.effects?.find((entry) => entry.isInherited);
    expect(inherited?.actions?.[0]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 } });
  });
});
