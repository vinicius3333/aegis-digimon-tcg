import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-055.js";

describe("BT19-055", () => {
  it("preserves OnDeletion reveal/add routing and inherited Reboot", () => {
    const card = runtimeCompiledCard("BT19-055");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            add: [
              { count: 1, to: "hand" },
              { count: 1, to: "underTamer", requiresMinRevealed: 2 },
            ],
            rest: "deckBottom",
          },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Reboot" }] },
    ]);
  });
});
