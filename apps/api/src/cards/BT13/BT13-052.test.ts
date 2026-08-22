import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-052.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-052 SymbareAngoramon", () => {
  it("registers Jamming and the inherited empty-opponent-board aura", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Jamming" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [expect.objectContaining({ kind: "Aura", while: expect.objectContaining({ kind: "opponentHasNone" }) })] });
  });

  it("exposes Jamming on the live SymbareAngoramon permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-052", as: "symbare" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("symbare"), "Jamming")).toBe(true);
  });
});
