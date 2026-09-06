import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT20/BT20-021.js";
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
// Test (2): attacking with ST12-08 under a Royal Knight plays one Sistermon from hand or
// trash, while the negative host and repeated-attack cases prove the trait and OPT guards.

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
        0: {
          battleArea: [{ card: LV4_BASE, dp: 4000, as: "base" }],
          hand: [{ card: SAVIOHUCKMON, as: "card" }],
          deck: ["ST1-02", "ST1-02"],
        },
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

  it("expires the unsuspended-Digimon attack permission when the turn changes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LV4_BASE, as: "base" }],
          hand: [{ card: SAVIOHUCKMON, as: "card" }],
          deck: ["ST1-02", "ST1-02", "ST1-02"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "unsuspended" }] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("card").instanceId,
      }),
    ).toEqual({ ok: true });
    const ledger = ledgerOf(s);
    await settle(() => ledger.canAttackUnsuspended(s.perm("base").permanentId), 400);

    expect(ledger.canAttackUnsuspended(s.perm("base").permanentId)).toBe(true);
    await advance(s.engine).runTurn(0);
    expect(ledger.canAttackUnsuspended(s.perm("base").permanentId)).toBe(false);
    expect([...s.perm("base").attackablePermanentIds]).not.toContain(s.perm("unsuspended").permanentId);
  });
});

describe("ST12-08 [When Attacking][Inherited] does not fire when attacker lacks Royal Knight trait", () => {
  it("Sistermon card stays in hand when the attacking Digimon has no Royal Knight trait", async () => {
    // A neutral level-6 host lacks Royal Knight, while ST12-08 is an active source.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST1-10", as: "attacker", under: [SAVIOHUCKMON] }],
          hand: [{ card: SISTERMON, as: "sistermon" }],
        },
        1: { security: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const p0 = s.state.players[0]!;
    const sistermonId = s.inst("sistermon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[1]!.security.length === 0);

    // Sistermon must still be in hand (Royal Knight check failed → no play).
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(p0.hand.some((c) => c.instanceId === sistermonId)).toBe(true);
  });
});

describe("ST12-08 [When Attacking][Inherited] plays Sistermon for a Royal Knight", () => {
  it("plays a Sistermon from hand without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-090", as: "royal", under: [SAVIOHUCKMON] }],
          hand: [{ card: "ST12-12", as: "sister" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("royal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("sister").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("sister").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("sister").instanceId)).toBe(false);
  });

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
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const sisterId = s.inst("sister").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("royal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === sisterId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === sisterId)).toBe(true);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === sisterId)).toBe(false);
  });

  it("only plays one Sistermon across multiple attacks in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-021", as: "royal", under: [SAVIOHUCKMON] }],
          hand: [
            { card: SISTERMON, as: "first" },
            { card: SISTERMON, as: "second" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const attacker = s.perm("royal");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("first").instanceId));
    await settle(() => s.state.players[1]!.security.length === 1);

    // There is no player intent for unsuspending; drive the production unsuspend seam so the
    // second attack is legal without bypassing combat validation.
    await advance(s.engine).verb.unsuspend([attacker.permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === SISTERMON)).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("second").instanceId)).toBe(true);
  });

  it("may decline the free play and leave the Sistermon in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST12-10", as: "royal", under: ["ST12-08"] }],
          trash: [{ card: "ST12-12", as: "sister" }],
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
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.decisions.at(-1)?.req.sourceCardId === "ST12-08",
    );
    const pending = s.state.pendingDecision!;
    expect(pending?.kind).toBe("optional");
    expect(s.decisions.at(-1)?.req.sourceCardId).toBe("ST12-08");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === sisterId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === sisterId)).toBe(false);
  });
});
