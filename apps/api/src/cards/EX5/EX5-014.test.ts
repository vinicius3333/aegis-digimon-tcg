import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-014.js";

describe("EX5-014 Apollomon", () => {
  it("has Blitz and gains Security Attack plus one per three digivolution cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.keywords).toMatchObject([
      { keyword: "Blitz" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      target: { filter: { isSelfRef: true } },
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      duration: "permanent",
      scaling: { per: 3, unit: "digivolutionCards" },
    });
  });
  it("deletes an opposing Digimon at or below the source's DP when security is removed", () => {
    expect(compiled.effects?.filter((entry) => entry.trigger === "YourTurn")[1]).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", dp: { op: "lte", relativeToSource: true } } },
            },
          ],
        },
      ],
    });
  });
});
