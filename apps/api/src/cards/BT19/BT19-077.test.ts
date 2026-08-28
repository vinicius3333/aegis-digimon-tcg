import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-077.js";

describe("BT19-077", () => {
  it("preserves security play, suspended reduced digivolution, attack lock, and deletion recovery", () => {
    const card = runtimeCompiledCard("BT19-077");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Security",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: { filter: { dp: { op: "lte", value: 2000 } } },
          },
        ],
      },
      {
        trigger: "Main",
        actions: [{ kind: "Digivolve", from: ["hand"], payCost: true, reduceCost: 2, optional: true, cost: { kind: "suspend" } }],
      },
      { trigger: "AllTurns", actions: [{ kind: "Restrict", restriction: "attackOrBlock", duration: "permanent" }] },
      { trigger: "OnDeletion", actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", toTop: true }] },
    ]);
  });
});
