import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-066.js";

describe("BT19-066", () => {
  it("preserves the optional Composite/Wicked God hand cost and inherited Blocker", () => {
    const card = runtimeCompiledCard("BT19-066");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 2,
            cost: {
              kind: "trash",
              target: {
                filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["Composite", "Wicked God"] }] },
              },
            },
            optional: true,
            abortOnDecline: true,
          },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Blocker" }] },
    ]);
  });
});
