import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-071.js";

describe("BT13-071 Giromon", () => {
  it("keeps Blocker and inherited opponent-turn security trash", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Blocker" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });
});
