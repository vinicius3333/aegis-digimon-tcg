import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-002.js";

describe("EX6-002 Yokomon", () => {
  it("inherits a once-per-turn attack cost to place a blue level 3 Digimon from hand under this Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlaceUnder",
          optional: true,
          position: "bottom",
          target: {
            count: 1,
            from: ["hand"],
            filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"], levels: [3] },
            underFilter: { isSelfRef: true },
          },
        },
      ],
    });
  });
});
