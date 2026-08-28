import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for P-094 (Destromon) — [On Play] delete opponent Digimon/Tamers with a total play cost of
// 3 (+1 per [Vemmon] digivolution card). source: documented behavior (budget multi-delete).
//
// FAILS-WHEN-REVERTED: with a single eligible opponent target whose play cost is within the
// budget, selectAndDeleteWithBudget auto-deletes it. A no-op leaves it on the field.

describe("P-094 [On Play] budget-delete an opponent permanent within a cost-3 budget", () => {
  it("deletes the single eligible opponent Digimon (play cost within budget)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-094", as: "destromon" }] },
        // One eligible opponent Digimon, play cost 2 (<= budget 3, no Vemmon under P-094).
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p1 = s.state.players[1]!;
    const target = s.perm("target");
    const targetPermanentId = target.permanentId;
    const targetTop = target.topCard!;
    s.state.memory = 10; // exact play cost

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("destromon").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => p1.trash.some((c) => c.instanceId === targetTop.instanceId));

    expect(p1.trash.some((c) => c.instanceId === targetTop.instanceId)).toBe(true);
    expect(p1.battleArea.some((perm) => perm.permanentId === targetPermanentId)).toBe(false);
  });
});
