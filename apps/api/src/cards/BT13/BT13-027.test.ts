import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-027.js";

describe("BT13-027 Shaujinmon", () => {
  it("keeps Blocker and optionally plays a level 4 or lower card from its stack", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OpponentsTurn", keywords: [expect.objectContaining({ keyword: "Blocker" })] });
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [expect.objectContaining({ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, optional: true })] });
  });
});
