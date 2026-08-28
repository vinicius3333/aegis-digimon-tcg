import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-054.js";

describe("EX7-054", () => {
  it("can give one of your Digimon Blocker by trashing a card, then gives that same target Retaliation", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "Blocker" }, optional: true, cost: { kind: "trash" } },
      { kind: "GainKeyword", keyword: { keyword: "Retaliation" }, condition: { kind: "ifThisEffectActed" } },
    ]));
  it("has the same effect on deletion and inherits once-per-turn attack ending by deleting another Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toHaveLength(2);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "EndAttack",
              cost: { kind: "deleteOwn", target: { filter: { excludeSelf: true }, count: 1 } },
            },
          ],
        },
      ],
    });
  });
});
