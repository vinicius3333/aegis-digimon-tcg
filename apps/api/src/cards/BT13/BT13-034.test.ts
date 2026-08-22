import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-034.js";

describe("BT13-034 Kudamon", () => {
  it("reveals three cards, adds the two yellow categories, and bottoms the rest", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            {
              count: 1,
              to: "hand",
              filter: { kind: ["Digimon"], colors: ["Yellow"], nameOrTrait: [{ match: "trait", tokens: ["Vaccine"] }] },
            },
            { count: 1, to: "hand", filter: { kind: ["Tamer"], colors: ["Yellow"] } },
          ],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          condition: { kind: "raw", raw: expect.stringContaining("6 or fewer") },
        },
      ],
    });
  });
});
