import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-091.js";

// A3 for BT5-091 (Takumi Aiba) — [All Turns] All level 3 Digimon gain
// "[When Attacking] Lose 1 memory."
//
// KB Q1369: the grant also applies to the granting Tamer's OWN level 3 Digimon.
// KB Q1370: two copies of Takumi Aiba each activate separately (a combined -2), though
// this A3 exercises the single-copy case (the grant-dedup key is per (instance, token) —
// see the doc comment in GRANTED_EFFECT_LIBRARY's consumer, a known residual for the
// two-copies-stacking case).
//
// FAILS-WHEN-REVERTED: `grantCustomEffect` names a token
// ("[When Attacking] Lose 1 memory.") with NO entry in GRANTED_EFFECT_LIBRARY before this
// fix — the grant installs into the ledger but `grantedTokenEffectsForTiming` returns `[]`
// for it, so attacking never loses memory. With the library entry, the granted Digimon's
// attack fires GainMemory(-1).

const TAKUMI = "BT5-091";
const LV3_DIGIMON = "BT1-009"; // Monodramon — level 3
const DUMMY_TARGET = "BT1-010"; // Agumon — arbitrary opponent Digimon target

describe('BT5-091 [All Turns] level 3 Digimon gain "[When Attacking] Lose 1 memory."', () => {
  it("loses 1 memory when a level 3 Digimon it granted the ability to attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAKUMI, dp: 0, as: "takumi" },
            { card: LV3_DIGIMON, dp: 3000, as: "attacker" },
          ],
          security: 3,
        },
        1: { battleArea: [{ card: DUMMY_TARGET, dp: 2000, as: "oppTarget", suspended: true }], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("oppTarget").permanentId },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => s.state.memory !== 5, 400);

    // The granted "[When Attacking] Lose 1 memory" fired: 5 - 1 = 4.
    expect(s.state.memory).toBe(4);
  });

  it("does NOT lose memory when a level 4+ Digimon attacks (grant is level-3-only)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAKUMI, dp: 0, as: "takumi" },
            // AD1-010 (Garurumon) is level 4 — outside the grant's level-3 filter.
            { card: "AD1-010", dp: 5000, as: "attacker" },
          ],
          security: 3,
        },
        1: { battleArea: [{ card: DUMMY_TARGET, dp: 2000, as: "oppTarget", suspended: true }], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("oppTarget").permanentId },
    });
    expect(res).toEqual({ ok: true });

    // Wait for the attack to resolve (the suspended defender is deleted in combat).
    await settle(() => s.state.players[1]?.battleArea.length === 0, 400);

    // No level-3 grant applies: memory is unaffected by the granted ability.
    expect(s.state.memory).toBe(5);
  });
});
