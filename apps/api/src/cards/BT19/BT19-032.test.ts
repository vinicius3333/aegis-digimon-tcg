import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-032 Shoutmon", () => {
  it("preserves deletion-triggered Security Attack reduction, security recovery, and inherited Barrier", () => {
    const card = runtimeCompiledCard("BT19-032");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "GainKeyword",
            duration: "untilOpponentTurnEnd",
            keyword: { keyword: "SecurityAttack", amount: -1 },
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
          {
            kind: "SecurityManipulation",
            op: "addTop",
            controller: "mine",
            source: "deck",
            amount: 1,
            condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 2 },
          },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Barrier" }] },
    ]);
  });
});
