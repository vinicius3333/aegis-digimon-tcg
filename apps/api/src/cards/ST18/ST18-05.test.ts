import { describe, expect, it } from "vitest";
import { compiled } from "./ST18-05.js";

describe("ST18-05 Muchomon", () => {
  it("expires its effect-suspension bonus at the end of the opponent's turn", () => {
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [expect.objectContaining({
        kind: "SubTrigger",
        actions: [expect.objectContaining({
          kind: "ModifyDP",
          amount: 3000,
          duration: "untilOpponentTurnEnd",
        })],
      })],
    }));
  });
});
