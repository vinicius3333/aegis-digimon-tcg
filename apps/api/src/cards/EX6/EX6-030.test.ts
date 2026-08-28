import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-030.js";

describe("EX6-030 Dominimon", () => {
  it("contains the security search/play and Angel protection clauses in typed IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("SearchSecurity");
    expect(text).toContain("PlayWithoutCost");
    expect(text).toContain("trashSecurityTop");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "SearchSecurity", then: { optional: true } },
      { kind: "ModifyDP", amount: -7000, duration: "untilEachTurnEnd" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      affectsAll: true,
      leaveCause: "otherThanBattle",
    });
  });
});
