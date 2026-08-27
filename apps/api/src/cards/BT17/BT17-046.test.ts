import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-046.js";

describe("BT17-046 Gargomon", () => {
  it("may play one Terriermon from trash on deletion", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Terriermon"], match: "name" }] }, count: 1 },
    });
  });

  it("gains 1000 DP while suspended as an inherited effect", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfIsSuspended" } }],
    });
  });
});
