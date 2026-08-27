import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-081.js";

describe("BT15-081", () => {
  it("has Security Attack +2 and may digivolve into itself from trash when an opponent plays by effect", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "SecurityAttack", amount: 2 }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isFromTrash: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { byEffect: true },
          actions: [{ kind: "Digivolve", into: { isSelfRef: true }, payCost: false, optional: true }],
        },
      ],
    });
  });
  it("deletes opposing Tamer and level 3/5/7 Digimon when the board-count condition is met", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Delete", condition: { kind: "boardCountCompare" } },
        { kind: "Delete", target: { filter: { levels: [3] } } },
        { kind: "Delete", target: { filter: { levels: [5] } } },
        { kind: "Delete", target: { filter: { levels: [7] } } },
      ],
    }));
});
