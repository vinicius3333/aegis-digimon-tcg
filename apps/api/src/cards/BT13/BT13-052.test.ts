import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-052.js";

describe("BT13-052 SymbareAngoramon", () => {
  it("registers Jamming and the inherited empty-opponent-board aura", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Jamming" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [expect.objectContaining({ kind: "Aura", while: expect.objectContaining({ kind: "opponentHasNone" }) })] });
  });
});
