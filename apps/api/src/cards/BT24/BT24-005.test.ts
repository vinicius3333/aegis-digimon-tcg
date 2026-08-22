import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-005.js";

describe("BT24-005 Kyokyomon", () => {
  it("reveals exactly three cards and lets the player return them to the top or bottom", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [{ kind: "RevealAdd", revealCount: 3, add: [], rest: "deckTopOrBottom" }],
        },
      ],
    });
  });
});
