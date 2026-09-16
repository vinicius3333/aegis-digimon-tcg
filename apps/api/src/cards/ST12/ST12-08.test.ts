import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT20/BT20-021.js";
import "../index.js";

interface ContinuousLedger {
  canAttackUnsuspended(permanentId: string): boolean;
}

function ledgerOf(s: EngineSetup): ContinuousLedger {
  return (s.engine as unknown as { continuous: ContinuousLedger }).continuous;
}

const SAVIOHUCKMON = "ST12-08";
const LV4_BASE = "BT1-015";
const SISTERMON = "BT10-085";

describe("ST12-08 [When Digivolving] allows attacking unsuspended opponent Digimon", () => {
  it("evolved Digimon can attack an unsuspended opponent Digimon after digivolving ST12-08", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LV4_BASE, dp: 4000, as: "base" }],
          hand: [{ card: SAVIOHUCKMON, as: "card" }],
          deck: ["ST1-02", "ST1-02"],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "unsuspended" }] },
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

    const ledger = ledgerOf(s);
    await settle(() => ledger.canAttackUnsuspended(base.permanentId), 400);
    await settle(() => base.attackablePermanentIds.includes(s.perm("unsuspended").permanentId), 400);
    expect(base.topCard?.cardId).toBe(SAVIOHUCKMON);
    expect([...base.attackablePermanentIds]).toContain(s.perm("unsuspended").permanentId);

    const attackResult = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: base.permanentId,
      target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
    });

    expect(attackResult).toEqual({ ok: true });
  });

  it("WITHOUT the ST12-08 WhenDigivolving effect (baseline), attacking unsuspended is illegal", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: LV4_BASE, dp: 4000, as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "unsuspended" }] },
    });

    await s.engine.recomputeContinuousEffects();
    expect([...s.perm("attacker").attackablePermanentIds]).not.toContain(s.perm("unsuspended").permanentId);

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
