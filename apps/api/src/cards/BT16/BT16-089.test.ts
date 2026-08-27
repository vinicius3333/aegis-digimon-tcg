import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-089.js";

describe("BT16-089", () => {
  it("reduces Arukenimon or Mummymon play cost by 3 by deleting this Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { zone: "hand" },
          actions: [
            {
              kind: "Replacement",
              mode: "reduceCost",
              amount: 3,
              cost: { kind: "deleteOwn" },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    });
  });

  it("plays a Myotismon-text level 5 or lower Digimon from trash on deletion and deletes itself later", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        { kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true },
        { kind: "DelayedDelete", timing: "endOfOpponentTurn" },
      ],
    });
  });

  it("plays itself from security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });
});
