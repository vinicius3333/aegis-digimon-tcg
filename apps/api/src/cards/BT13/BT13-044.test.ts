import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-044.js";

describe("BT13-044 BanchoLeomon", () => {
  it("uses the top security card for the DP reduction and reacts to security removal", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      keywords: [expect.objectContaining({ keyword: "Blocker" })],
      actions: [
        {
          kind: "ModifyDP",
          amount: -6000,
          optional: false,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] }, count: 1 },
            },
          ],
        },
      ],
    });
  });
});
