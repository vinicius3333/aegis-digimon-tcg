import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT17-102 (Greymon, White Lv.4):
//   [When Digivolving] If this Digimon's name is [Koromon], it gains +3000 DP for the
//     turn. Then, delete 1 of your opponent's Digimon with as much or less DP as this
//     Digimon. (KB Q4713: delete fires even if Koromon condition is not met)
//   [All Turns] RESIDUAL — dynamic name grant, no engine primitive.
//   [On Deletion] You may play 1 Tamer with [Tai Kamiya] or [Kari Kamiya] in its name
//     from your hand without paying cost, OR hatch in your breeding area.
//
// FAILS-WHEN-REVERTED: the declarative effect record had all clauses as RawUnparsed no-ops.
// Test: [When Digivolving] deletes an opponent Digimon with DP ≤ Greymon's DP (5000).

const GREYMON = "BT17-102";
// Lv.3 Agumon (Red) — a valid digivolve base for BT17-102 ("from Lv.3 w/ [Agumon] in name, cost 2").
const AGUMON_LV3 = "BT1-010";

describe("BT17-102 Greymon — [When Digivolving] delete opponent Digimon (KB Q4713)", () => {
  it("[When Digivolving] deletes 1 opponent Digimon with DP ≤ Greymon's 5000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          // Lv.3 Agumon as the digivolve base for p0.
          battleArea: [{ card: AGUMON_LV3, dp: 1000, as: "agumon" }],
          // Greymon in p0's hand; digivolve onto Agumon (cost 2, p0 needs ≥2 memory).
          hand: [{ card: GREYMON, as: "greymon" }],
        },
        // Opponent has a Digimon with DP ≤ 5000 — eligible to be deleted. (BT1-009 Monodramon —
        // BT1-007 Tanemon is a DigiEgg, not a Digimon, and can never satisfy the [Digimon]-kind
        // filter this effect requires.)
        1: { battleArea: [{ card: "BT1-009", dp: 4000, as: "oppTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0];
    const p1 = s.state.players[1];
    s.state.turnSeat = 0;
    s.state.memory = 5;
    const agumonId = s.perm("agumon").permanentId;
    const greymonId = s.inst("greymon").instanceId;
    const oppPermId = s.perm("oppTarget").permanentId;

    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      instanceId: greymonId,
      permanentId: agumonId,
    });
    expect(res.ok).toBe(true);

    // Wait for Greymon to leave p0's hand (digivolve completed).
    await settle(() => !p0?.hand.some((c) => c.instanceId === greymonId), 600);

    // Wait for the [When Digivolving] effect: opponent's target Digimon should be deleted.
    await settle(() => !p1?.battleArea.some((p) => p.permanentId === oppPermId), 800);

    // The opponent's Digimon with 4000 DP (≤ Greymon's 5000 DP) was deleted.
    expect(p1?.battleArea.some((p) => p.permanentId === oppPermId)).toBe(false);
  });
});
