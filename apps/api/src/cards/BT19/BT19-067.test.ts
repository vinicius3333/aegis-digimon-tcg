import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-067 Impmon", () => {
  it("preserves the limited-Tamer purple Tamer revival and inherited Retaliation", () => {
    const card = runtimeCompiledCard("BT19-067");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [{
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Purple"],
              playCostLte: 4,
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "youHave",
            countMin: 0,
            countMax: 1,
            filter: { controllerDefault: "mine", kind: ["Tamer"] },
          },
          optional: true,
        }],
      },
      {
        trigger: "Static",
        actions: [],
        isInherited: true,
        keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
      },
    ]);
  });
});
