import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-066.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-066 Dorugamon", () => {
  it("grants inherited DP while carrying X Antibody", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [expect.objectContaining({ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: expect.objectContaining({ kind: "selfHasTrait" }) })] });
  });

  it("loads the compiled Dorugamon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-066", as: "doru" }] } });
    await s.ready();
    expect(s.perm("doru").topCard?.cardId).toBe("BT13-066");
  });
});
