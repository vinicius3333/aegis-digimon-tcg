import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-074.js";

describe("BT13-074 PrinceMamemon", () => {
  it("uses reveal-play clauses and continuous Jamming/Reboot auras", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3 })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3 })] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "AllTurns", actions: [expect.objectContaining({ kind: "Aura", effect: { kind: "keyword", keyword: expect.objectContaining({ keyword: "Jamming" }) } }), expect.objectContaining({ kind: "Aura", effect: { kind: "keyword", keyword: expect.objectContaining({ keyword: "Reboot" }) } })] });
  });

  it("grants Jamming and Reboot to Mamemon and Royal Knight Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-074", as: "prince" }, { card: "BT11-068", as: "mamemon" }, { card: "BT13-075", as: "alphamon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("mamemon"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("mamemon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("alphamon"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("alphamon"), "Reboot")).toBe(true);
  });
});
