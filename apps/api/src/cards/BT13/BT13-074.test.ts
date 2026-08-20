import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-074.js";

describe("BT13-074 PrinceMamemon", () => {
  it("uses reveal-play clauses and continuous Jamming/Reboot auras", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3 })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3 })] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "AllTurns", actions: [expect.objectContaining({ kind: "Aura", effect: { kind: "keyword", keyword: expect.objectContaining({ keyword: "Jamming" }) } }), expect.objectContaining({ kind: "Aura", effect: { kind: "keyword", keyword: expect.objectContaining({ keyword: "Reboot" }) } })] });
  });
});
