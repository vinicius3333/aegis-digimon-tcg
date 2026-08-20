import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-031.js";

describe("BT13-031 MirageGaogamon", () => {
  it("registers Evade, Tamer bounce, and the once-per-turn Thomas trigger", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Evade" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "Return", to: "hand", target: expect.objectContaining({ filter: expect.objectContaining({ kind: ["Tamer"] }) }) })] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand" })] });
  });
});
