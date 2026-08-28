import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-005.js";

describe("EX5-005 Tokomon", () => {
  it("draws one on deletion during the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "isOpponentsTurn" } }],
    });
  });
});
