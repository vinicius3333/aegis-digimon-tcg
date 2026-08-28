import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-079.js";

describe("BT18-079 Velgrmon", () => {
  it("covers both play triggers, opponent color scaling, and Retaliation", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(4);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay" });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({ trigger: "EndOfAttack" });
    expect(compiled.effects[3]).toMatchObject({ isInherited: true, keywords: [{ keyword: "Retaliation" }] });
  });
});
