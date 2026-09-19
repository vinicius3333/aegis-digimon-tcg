import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./RB1-006.js";

describe("RB1-006 Gammamon", () => {
  it("can attack an unsuspended Digimon while a red Tamer is in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-062" }, { card: "RB1-006", as: "gammamon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("gammamon"))).toBe(true);
    expect([...s.perm("gammamon").attackablePermanentIds]).toContain(s.perm("target").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gammamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("can't attack an unsuspended Digimon without a red Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009" }, { card: "RB1-006", as: "gammamon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("gammamon"))).toBe(false);
    expect([...s.perm("gammamon").attackablePermanentIds]).not.toContain(s.perm("target").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gammamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("can't attack an unsuspended Digimon while the only Tamer in play is not red", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-086" }, { card: "RB1-006", as: "gammamon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("gammamon"))).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gammamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("can't attack an unsuspended Digimon while the red Tamer belongs to the opponent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-006", as: "gammamon" }] },
      1: { battleArea: [{ card: "P-062" }, { card: "BT1-009", as: "target" }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("gammamon"))).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gammamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("loses the grant in the same game once the red Tamer leaves play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-062", as: "tamer" },
          { card: "RB1-006", as: "gammamon" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("gammamon"))).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId]);

    expect(observe(s.engine).canAttackUnsuspended(s.perm("gammamon"))).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gammamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("can't attack an unsuspended Digimon on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-062" }, { card: "RB1-006", as: "gammamon" }],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "target" }],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
    });
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("gammamon"))).toBe(true);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(observe(s.engine).canAttackUnsuspended(s.perm("gammamon"))).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gammamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }).ok,
    ).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("can't attack an unsuspended Digimon while the red Tamer is only in hand and trash", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-062" }],
        trash: [{ card: "P-062" }],
        battleArea: [{ card: "RB1-006", as: "gammamon" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("gammamon"))).toBe(false);
    expect([...s.perm("gammamon").attackablePermanentIds]).not.toContain(s.perm("target").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gammamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("RB1-006");
    const compiled = registeredCompiledCards.get("RB1-006") ?? getCompiledCard("RB1-006");
    expect(definition).toMatchObject({ cardId: "RB1-006", nameEn: "Gammamon", level: 3, dp: 4000, playCost: 4 });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects).toHaveLength(1);
  });
});
