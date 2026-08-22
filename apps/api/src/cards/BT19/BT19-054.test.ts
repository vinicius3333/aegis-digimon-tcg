import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-054.js";

describe("BT19-054", () => {
  it("preserves Security Attack +1 and optional suspended-Digimon bottom-decking", () => {
    const card = runtimeCompiledCard("BT19-054");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "SecurityAttack", amount: 1 }] },
      ...["WhenDigivolving", "WhenAttacking"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Return",
            target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] } },
            to: "deckBottom",
            optional: true,
          },
        ],
      })),
    ]);
  });
});
