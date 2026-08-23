import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-069.js";

describe("BT18-069 Knightmon", () => {
  it("declares the optional once-per-turn forced attack at the opponent's end turn", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      optional: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Attack",
          mandatory: true,
          attackPlayer: true,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  it("keeps Blocker and the inherited Knightmon DP effect", () => {
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });
});
