import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-063.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-063 Dorumon", () => {
  it("grants inherited DP only with X Antibody", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [expect.objectContaining({ kind: "Aura", while: expect.objectContaining({ kind: "selfHasTrait" }), effect: { kind: "modifyDP", amount: 1000 } })] });
  });

  it("loads the compiled Dorumon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-063", as: "doru" }] } });
    await s.ready();
    expect(s.perm("doru").topCard?.cardId).toBe("BT13-063");
  });
});
