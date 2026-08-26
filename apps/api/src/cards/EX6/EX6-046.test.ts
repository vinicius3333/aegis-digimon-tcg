import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-046.js";

describe("EX6-046 DemiDevimon", () => {
  it("draws and trashes from your hand when the opponent has five or fewer cards, or trashes their hand at seven or more", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toMatchObject([
      { kind: "Draw", amount: 1, condition: { kind: "zoneCount", op: "lte", value: 5 } },
      { kind: "Trash", condition: { kind: "zoneCount", op: "lte", value: 5 } },
      { kind: "Trash", chooser: "opponent", condition: { kind: "zoneCount", op: "gte", value: 7 } },
    ]));
  it("inherits +1000 DP while the opponent has six or fewer cards", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        { kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "zoneCount", op: "lte", value: 6 } },
      ],
    }));
});
