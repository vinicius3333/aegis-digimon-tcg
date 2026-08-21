import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-045", () => {
  it("preserves security Royal Base DP, digivolution cost reduction, and inherited DP", () => {
    const card = runtimeCompiledCard("BT19-045");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "AllTurns",
        isSecurity: true,
        actions: [
          {
            kind: "ModifyDP",
            amount: 1000,
            duration: "permanent",
            target: { filter: { nameOrTrait: [{ tokens: ["Royal Base"] }] } },
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldDigivolve",
            into: { nameOrTrait: [{ tokens: ["Royal Base"] }] },
            actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
          },
        ],
      },
      { trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] },
    ]);
  });
});
