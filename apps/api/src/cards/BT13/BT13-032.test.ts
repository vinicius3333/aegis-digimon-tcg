import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-032.js";

describe("BT13-032 JumboGamemon", () => {
  it("keeps Blocker and the level-5 stack-play trigger", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OpponentsTurn", keywords: [expect.objectContaining({ keyword: "Blocker" })] });
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [expect.objectContaining({ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, optional: true })] });
  });
});
