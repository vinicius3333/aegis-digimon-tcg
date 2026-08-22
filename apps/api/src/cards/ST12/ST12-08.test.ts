import { describe, it, expect } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for ST12-08 (SaviorHuckmon) — two effects:
//   (1) [When Digivolving] This Digimon may also attack opponent's unsuspended Digimon for the turn.
//   (2) [When Attacking][Inherited][Once Per Turn] If Royal Knight in traits, play 1 Sistermon free.
//       source: documented behavior.
//
// FAILS-WHEN-REVERTED:
//   (1) Without the WhenDigivolving effect, the Digimon cannot attack an unsuspended target
//       (attack intent returns "illegal-target" for an unsuspended permanent).
//   (2) Without the WhenAttacking effect, the Sistermon stays in hand after an attack with
//       a Royal Knight on top.
//
// Test (1): after digivolving ST12-08 onto a Lv.4 base, the evolved Digimon can attack
// an unsuspended opponent Digimon (which is normally illegal). This directly exercises
// the canAttackUnsuspended grant written by the WhenDigivolving effect.
//
// Test (2): attacking with ST12-08 as top card (Dragonkin, NOT Royal Knight) does NOT
// play a Sistermon from hand — this verifies the Royal Knight trait guard works correctly.
// The positive Royal Knight test is deferred (requires stacking a Royal Knight definition
// on top of a permanent, which requires a real level-7 Royal Knight card from the test data).

interface ContinuousLedger {
  canAttackUnsuspended(permanentId: string): boolean;
}

function ledgerOf(s: EngineSetup): ContinuousLedger {
  return (s.engine as unknown as { continuous: ContinuousLedger }).continuous;
}

// ST12-08 SaviorHuckmon — Red Lv.5, evoCosts [{color:"Red",level:4,memoryCost:3}].
// BT1-015 Greymon — Red Lv.4, playCost 4 → valid digivolution base.
// BT10-085 Sistermon Ciel — Lv.4, has "Sistermon" in nameEn → target for the attack clause.
const SAVIOHUCKMON = "ST12-08";
const LV4_BASE = "BT1-015"; // Red Lv.4 Greymon — valid evo base
const SISTERMON = "BT10-085"; // Sistermon Ciel

describe("ST12-08 [When Digivolving] allows attacking unsuspended opponent Digimon", () => {
  it("evolved Digimon can attack an unsuspended opponent Digimon after digivolving ST12-08", async () => {
    // Place a Lv.4 Red Digimon as the digivolution base, and digivolve ST12-08 onto it.
    const s = setupEngine(
      {
        0: { battleArea: [{ card: LV4_BASE, dp: 4000, as: "base" }], hand: [{ card: SAVIOHUCKMON, as: "card" }] },
        // Opponent's UNSUSPENDED Digimon (normally an "illegal-target").
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "unsuspended" }] }, // Monodramon, not suspended
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const base = s.perm("base");
    s.state.memory = 10;

    const evoResult = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.inst("card").instanceId,
    });
    expect(evoResult).toEqual({ ok: true });

    // Wait until the WhenDigivolving async effect resolves — not just until the card
    // appears as the top card (that mutation is sync). The effect fires asynchronously
    // via fireWhenDigivolving and calls grantCanAttackUnsuspended; we must wait until
    // the grant is visible in the continuous ledger before issuing the attack.
    const ledger = ledgerOf(s);
    await settle(() => ledger.canAttackUnsuspended(base.permanentId), 400);
    await settle(() => base.attackablePermanentIds.includes(s.perm("unsuspended").permanentId), 400);
    expect(base.topCard?.cardId).toBe(SAVIOHUCKMON);
    expect([...base.attackablePermanentIds]).toContain(s.perm("unsuspended").permanentId);

    // ST12-08's WhenDigivolving grants CanAttackUnsuspended → this attack should be legal.
    const attackResult = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: base.permanentId,
      target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
    });

    // The grant should make this attack legal. Without the effect, it would be "illegal-target".
    expect(attackResult).toEqual({ ok: true });
  });

  it("WITHOUT the ST12-08 WhenDigivolving effect (baseline), attacking unsuspended is illegal", async () => {
    // Place a Lv.4 Digimon directly (no digivolve, no WhenDigivolving effect fired).
    const s = setupEngine({
      0: { battleArea: [{ card: LV4_BASE, dp: 4000, as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "unsuspended" }] },
    });

    await s.engine.recomputeContinuousEffects();
    expect([...s.perm("attacker").attackablePermanentIds]).not.toContain(s.perm("unsuspended").permanentId);

    // Without the grant, attacking an unsuspended Digimon is illegal.
    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
    });
    expect(result).toEqual({ ok: false, reason: "illegal-target" });
  });
});

describe("ST12-08 [When Attacking][Inherited] does not fire when attacker lacks Royal Knight trait", () => {
  it("Sistermon card stays in hand when the attacking Digimon has no Royal Knight trait", async () => {
    // ST12-08 as top card — its type is "Dragonkin", NOT Royal Knight. The inherited
    // effect requires Royal Knight in the ATTACKER's traits, so it won't fire here.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SAVIOHUCKMON, dp: 6000, as: "attacker" }],
          hand: [{ card: SISTERMON, as: "sistermon" }],
        },
        1: { security: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const p0 = s.state.players[0]!;
    const sistermonId = s.inst("sistermon").instanceId;

    const attackResult = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });

    await settle(() => true, 200);

    // Sistermon must still be in hand (Royal Knight check failed → no play).
    expect(p0.hand.some((c) => c.instanceId === sistermonId)).toBe(true);
    void attackResult;
  });
});

describe("ST12-08 [When Attacking][Inherited] plays Sistermon for a Royal Knight", () => {
  it("plays a Sistermon from trash without paying its cost once the Royal Knight attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST12-10", as: "royal", under: ["ST12-08"] }],
          trash: [{ card: "ST12-12", as: "sister" }],
          hand: [{ card: "BT1-001", as: "cost" }],
          deck: ["BT1-002", "BT1-003"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoOrderTriggers: true },
    );
    const sisterId = s.inst("sister").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("royal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return latest?.kind === "optional" && latest.decisionId === s.state.pendingDecision?.decisionId;
    });

    const optional = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return latest?.kind === "selectCards" && latest.decisionId === s.state.pendingDecision?.decisionId;
    });
    const selection = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [sisterId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return latest?.kind === "optional" && latest.decisionId === s.state.pendingDecision?.decisionId;
    });
    const blancCost = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: blancCost.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return latest?.kind === "selectCards" && latest.decisionId === s.state.pendingDecision?.decisionId;
    });
    const costSelection = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: costSelection.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("cost").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === sisterId));
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === sisterId)).toBe(false);
  });
});
