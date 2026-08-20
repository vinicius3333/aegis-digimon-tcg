import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-054.js";

describe("BT13-054 Lilamon", () => {
  it("plays Yoshino optionally and grants inherited Security Attack +1 conditionally", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "PlayWithoutCost", optional: true })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [expect.objectContaining({ kind: "Aura", effect: { kind: "keyword", keyword: expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }) } })] });
  });
});
