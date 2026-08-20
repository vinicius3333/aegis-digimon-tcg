import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-025.js";

describe("BT13-025 GaoGamon", () => {
  it("conditionally plays Thomas and preserves the inherited hand-size aura", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "PlayWithoutCost", optional: true, condition: expect.objectContaining({ kind: "youHaveNone" }) })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [expect.objectContaining({ kind: "Aura" })] });
  });
});
