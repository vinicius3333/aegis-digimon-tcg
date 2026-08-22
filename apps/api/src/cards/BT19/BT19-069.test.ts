import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-069.js";

describe("BT19-069", () => {
  it("preserves hand-cost deletion on all three timings and inherited Blocker", () => {
    const card = runtimeCompiledCard("BT19-069");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving", "OnDeletion"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } } },
            cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" } } },
            optional: true,
            abortOnDecline: true,
          },
        ],
      })),
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Blocker" }] },
    ]);
  });
});
