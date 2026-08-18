import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// A3 for BT11-093 (Yuuya Kuga — Black Tamer).
//
// [Start of Your Turn] If memory is 2 or less, set it to 3.
//
// [Your Turn] When one of your Digimon digivolves into a Digimon with [Greymon]
// in its name, by suspending this Tamer, that Digimon gets +2000 DP until the
// end of your opponent's turn.
//
// FAILS-WHEN-REVERTED:
//   Test 1 — [Start of Your Turn] with memory <= 2: memory is raised to 3.
//     The original stub left this clause inert. Tested via runOneTurn()
//     seam (OnStartTurn only fires during the real turn loop).
//   Test 2 — [Your Turn] digivolve into a Greymon-named Digimon: Yuuya suspends and
//     the target Digimon gains +2000 DP.
//     After digivolving ST15-11 (MetalGreymon, 8000 DP) → BT2-065 (WarGreymon, 11000 DP),
//     the permanent's currentDP becomes 11000. Yuuya's +2000 boost makes it 13000.
//
// Cards:
//   BT11-093  — Yuuya Kuga (the Tamer, Black; playCost 4)
//   ST15-11   — MetalGreymon (Black Lv.5; evoCost: Black Lv.4 @ 3) — digivolve base
//   BT2-065   — WarGreymon (Black Lv.6; evoCost: Black Lv.5 @ 3) — digivolves on top (Greymon in name)
//   BT1-001   — filler

describe("BT11-093 Yuuya Kuga", () => {
  it("[Start of Your Turn] sets memory to 3 when memory <= 2", async () => {
    const s = setupEngine(
      {
        0: {
          // Yuuya on the battle area.
          battleArea: [{ card: "BT11-093", dp: 0 }],
          // Deck fodder for the draw phase.
          deck: Array.from({ length: 5 }, () => "BT1-001"),
          // A playable hand card prevents the engine from auto-ending Main phase.
          hand: ["AD1-001"],
        },
        1: { deck: Array.from({ length: 5 }, () => "BT1-001") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 1; // within the <= 2 range
    s.state.turnSeat = 0;
    s.state.isFirstPlayersFirstTurn = true;

    // Drive ONE real turn. OnStartTurn fires before the Main phase opens.
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    for (let i = 0; i < 500 && !mainPhase.isOpen; i++) await Promise.resolve();

    // Yuuya's [Start of Your Turn] should have raised memory to 3 by now.
    expect(s.state.memory).toBe(3);

    // End the Main phase so runOneTurn() can complete.
    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("[Your Turn] when a Greymon-named Digimon digivolves, Yuuya suspends and grants +2000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // Yuuya Kuga (Tamer) on the battle area.
            { card: "BT11-093", dp: 0, as: "yuuyaPerm" },
            // A Black Lv.5 MetalGreymon on the battle area (will be the digivolve base).
            // ST15-11 MetalGreymon: dp=8000 in card data; BT2-065 WarGreymon: dp=11000.
            // After digivolving into BT2-065, permanent.currentDP = 11000.
            // Yuuya's +2000 boost makes currentDP = 13000.
            { card: "ST15-11", dp: 8000, as: "metalGreymon" },
          ],
          deck: ["BT1-001"], // fodder for the digivolve draw
          // WarGreymon (Black Lv.6, Greymon-named) in hand. evoCost: Black Lv.5 @ 3.
          hand: [{ card: "BT2-065", as: "warGreymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const yuuyaPerm = s.perm("yuuyaPerm");
    const metalGreymon = s.perm("metalGreymon");
    const warGreymon = s.inst("warGreymon");
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: metalGreymon.permanentId,
      instanceId: warGreymon.instanceId,
    });

    expect(result).toEqual({ ok: true });

    // After digivolving into WarGreymon (Greymon name), Yuuya should be suspended
    // and WarGreymon should have +2000 DP on top of its natural 11000 DP = 13000.
    // Wait until both: Yuuya is suspended AND the DP boost has landed.
    await settle(() => yuuyaPerm.isSuspended && metalGreymon.currentDP > 11000);

    expect(yuuyaPerm.isSuspended).toBe(true);
    // After digivolve the permanent gains BT2-065's DP (11000), then +2000 → 13000.
    expect(metalGreymon.currentDP).toBe(13000);
  });

  it("grants opponent Option immunity after a same-level Greymon digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-093", as: "yuuya" },
            { card: "BT5-010", as: "greymon" },
          ],
          hand: [{ card: "BT11-064", as: "greymonX" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greymon").permanentId,
        instanceId: s.inst("greymonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("yuuya").isSuspended && observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Option"),
    );

    expect(observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Option")).toBe(true);
  });
});
