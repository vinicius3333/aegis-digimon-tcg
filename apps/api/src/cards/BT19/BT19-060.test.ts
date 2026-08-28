import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-060.js";

describe("BT19-060", () => {
  it("preserves the one-or-fewer-Tamers Ryo Akiyama play and inherited DP", () => {
    const card = runtimeCompiledCard("BT19-060");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { nameOrTrait: [{ tokens: ["Ryo Akiyama"] }] } },
            from: ["hand"],
            payCost: false,
            condition: { kind: "permanentCount", seat: "mine", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
            optional: true,
          },
        ],
      },
      { trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] },
    ]);
  });
});
