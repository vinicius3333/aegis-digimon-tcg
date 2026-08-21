import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-023 Greymon", () => {
  it("preserves Blocker, battle-deletion protection, and inherited attack-target protection", () => {
    const card = runtimeCompiledCard("BT19-023");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Blocker" }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Restrict",
            restriction: "beDeletedInBattle",
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          },
        ],
      })),
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "Restrict",
            restriction: "attackTargetChange",
            duration: "permanent",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        ],
      },
    ]);
  });
});
