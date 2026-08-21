import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-054 MegaGargomon", () => {
  it("preserves Security Attack +1 and optional bottom-decking on both triggers", () => {
    const card = runtimeCompiledCard("BT19-054");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }] },
      ...["WhenDigivolving", "WhenAttacking"].map((trigger) => ({
        trigger,
        actions: [{
          kind: "Return",
          target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 },
          to: "deckBottom",
          optional: true,
        }],
      })),
    ]);
  });
});
