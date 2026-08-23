import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-001.js";

describe("P-001 Agumon", () => {
  it("deletes only an opponent Digimon with 3000 DP or less on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-001", as: "agumon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "eligible", dp: 3000 },
            { card: "BT1-027", as: "tooBig", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const eligible = s.perm("eligible");
    const tooBig = s.perm("tooBig");
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !p1.battleArea.some((p) => p.permanentId === eligible.permanentId));
    expect(p1.battleArea.some((p) => p.permanentId === eligible.permanentId)).toBe(false);
    expect(p1.battleArea.some((p) => p.permanentId === tooBig.permanentId)).toBe(true);
  });
});
