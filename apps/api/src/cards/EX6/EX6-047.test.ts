import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-047.js";

describe("EX6-047 Boogiemon", () => {
  it("reveals three for Fallen Angel/Demon Lord and purple Options, then trashes a hand card if it added", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          { count: 1, to: "hand" },
          { count: 1, to: "hand" },
        ],
        rest: "deckBottom",
      },
      { kind: "Trash", condition: { kind: "ifThisEffectActed" } },
    ]));
  it("inherits +1000 DP while the opponent has six or fewer cards", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        { kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "zoneCount", op: "lte", value: 6 } },
      ],
    }));
});
