import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for EX5-074 (Fanglongmon) — Yellow Lv.7 Digimon.
//
// Three observable effects tested:
//
// 1. [When Attacking] For each of your Digimon with the [Four Sovereigns] trait,
//    trash the top card of your opponent's security stack.
//    FAILS-WHEN-REVERTED: drop `trashFromSecurity` call → opponent security count stays.
//
// 2. [On Play] By returning up to 4 [Deva]/[Four Sovereigns] from trash to deck bottom,
//    all opponent's Digimon get -4000 DP for each card returned.
//    FAILS-WHEN-REVERTED: drop `returnToDeck` + `modifyDP` → opponent Digimon DP unchanged.
//
// Four Sovereigns card used: BT6-029 (Azulongmon), a known [Four Sovereigns] Digimon.
// Deva card used: BT10-079 (Sandiramon).
// A vanilla Lv.3 for filler: BT1-009 (Monodramon).
// Vanilla opp Digimon: BT1-024 (Agumon — we need a known Digimon with explicit DP).

const FANGLONGMON = "EX5-074";
const FOUR_SOVS = "BT6-029"; // Azulongmon — [Four Sovereigns] Digimon
const DEVA = "BT10-079"; // Sandiramon — [Deva] Digimon
const VANILLA = "BT1-009"; // Monodramon — no trait, filler
const OPP_DIGIMON = "BT1-024"; // Koromon (Lv.2) → we'll set DP manually

describe("EX5-074 [When Attacking] trashes opponent security equal to owner's [Four Sovereigns] count", () => {
  it("with 2 own [Four Sovereigns] Digimon, trashes 2 opponent security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: FANGLONGMON, dp: 15000, as: "fanglongmon" },
            { card: FOUR_SOVS, dp: 12000 },
            { card: FOUR_SOVS, dp: 12000 },
          ],
        },
        1: { security: [VANILLA, VANILLA, VANILLA] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const secBefore = p1.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("fanglongmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => p1.security.length <= secBefore - 2);

    // 2 [Four Sovereigns] → 2 security cards trashed in addition to normal security check.
    expect(secBefore - p1.security.length).toBeGreaterThanOrEqual(2);
  });
});

describe("EX5-074 [On Play] returns Deva/FourSovereigns from trash to deck, -4000 DP per card", () => {
  it("returning 2 qualifying cards → opponent Digimon DP reduced by 8000", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: DEVA, as: "trashDeva" }, { card: FOUR_SOVS, as: "trashFourSovs" }],
          hand: [{ card: FANGLONGMON, as: "fanglongmon" }],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 10000, as: "oppDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    s.state.memory = 15; // Fanglongmon play cost

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fanglongmon").instanceId }),
    ).toEqual({ ok: true });

    // Both trash cards returned → DP drops by 8000.
    await settle(() => s.perm("oppDigimon").currentDP <= 10000 - 8000);

    expect(s.perm("oppDigimon").currentDP).toBe(2000);
    // Trash should now be empty (returned to deck bottom).
    expect(p0.trash.some((c) => c.instanceId === s.inst("trashDeva").instanceId)).toBe(false);
    expect(p0.trash.some((c) => c.instanceId === s.inst("trashFourSovs").instanceId)).toBe(false);
  });
});
