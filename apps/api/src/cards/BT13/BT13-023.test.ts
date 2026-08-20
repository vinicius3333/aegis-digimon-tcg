import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-023.js";

describe("BT13-023 Jellymon", () => {
  it("registers Evade and trashes the opponent's bottom evolution card", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Evade" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, actions: [expect.objectContaining({ kind: "TrashDigivolution", amount: 1, fromTop: false })] });
  });
});
