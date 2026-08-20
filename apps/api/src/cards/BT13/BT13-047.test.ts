import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-047.js";

describe("BT13-047 Angoramon", () => {
  it("keeps Blocker and the no-unsuspended-opponent aura", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Blocker" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [expect.objectContaining({ kind: "Aura", while: expect.objectContaining({ kind: "opponentHasNone" }) })] });
  });
});
