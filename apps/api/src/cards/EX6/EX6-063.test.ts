import { describe, it, expect } from "vitest";
import { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for EX6-063 (T.K. Takaishi & Kari Kamiya) — Yellow Tamer.
//
// [On Play] 1 of your yellow Digimon gains ＜Barrier＞ until the end of your
// opponent's turn. grantKeyword("Barrier", UntilOpponentTurnEnd) on the chosen permanent.
//
// FAILS-WHEN-REVERTED: remove the `grantKeyword` call in the onPlay handler → the yellow
// Digimon does NOT have the Barrier keyword grant recorded in the ledger.
//
// Yellow Lv.4 Digimon used: BT1-060 (MagnaAngemon) has Angel trait.
// Yellow Lv.5 Digimon used: BT1-063 (Seraphimon) has Archangel / Angel trait.
// A Digimon with no yellow color: BT1-009 (Monodramon, Red).

const TKTK = "EX6-063";
const YELLOW_DIGIMON = "BT1-057"; // Sirenmon — Yellow Lv.5
const FILLER = "BT1-009"; // Monodramon — non-yellow, filler

function ledger(s: EngineSetup): ContinuousEffectLedger {
  return (s.engine as unknown as { continuous: ContinuousEffectLedger }).continuous;
}

describe("EX6-063 [On Play] grants Barrier to 1 yellow Digimon", () => {
  it("the chosen yellow Digimon gets a Barrier keyword grant after playing the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: YELLOW_DIGIMON, dp: 7000, as: "yellowDigimon" }],
          hand: [{ card: TKTK, as: "tktk" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3; // EX6-063 play cost = 3
    const yellowDigimon = s.perm("yellowDigimon");

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tktk").instanceId }),
    ).toEqual({ ok: true });

    // Wait for the Barrier grant to be recorded (onPlay effect resolves asynchronously).
    await settle(() => ledger(s).hasKeyword(yellowDigimon.permanentId, "Barrier"));

    // The yellow Digimon should now have Barrier in the keyword grants.
    expect(ledger(s).hasKeyword(yellowDigimon.permanentId, "Barrier")).toBe(true);
    // FAILS-WHEN-REVERTED: grantKeyword removed → no Barrier grant in the ledger.
  });

  it("does not grant Barrier to a non-yellow Digimon (color guard)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: FILLER, dp: 2000, as: "nonYellow" }], // Monodramon — Red color
          hand: [{ card: TKTK, as: "tktk" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const p0Battle = s.state.players[0]?.battleArea;
    const nonYellow = s.perm("nonYellow");

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tktk").instanceId }),
    ).toEqual({ ok: true });

    // Wait for the tamer to reach battle area (play resolved); no Barrier expected.
    await settle(() => (p0Battle ?? []).some((perm) => perm.topCard?.cardId === TKTK));
    // Additional ticks to let the onPlay effect finish (even without a valid target).
    for (let i = 0; i < 50; i++) await Promise.resolve();

    // No Barrier grant on a non-yellow Digimon.
    expect(ledger(s).hasKeyword(nonYellow.permanentId, "Barrier")).toBe(false);
  });
});
