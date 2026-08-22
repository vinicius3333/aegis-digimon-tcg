import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-039", () => {
  it("preserves security-cost deletion, Recovery, and inherited security-removal unsuspend", () => {
    const card = runtimeCompiledCard("BT19-039");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Delete",
            target: { filter: { kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } } },
            cost: { kind: "trash", target: { filter: { zone: "security", position: "top" }, count: 1 } },
          },
          { kind: "GainMemory", amount: 1 },
        ],
      })),
      { trigger: "OnDeletion", keywords: [{ keyword: "Recovery", amount: 1 }] },
      {
        trigger: "AllTurns",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "Unsuspend" }] }],
      },
    ]);
  });
});
