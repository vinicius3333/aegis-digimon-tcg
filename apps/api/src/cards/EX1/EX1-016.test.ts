import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-016.js";

describe("EX1-016 Ikkakumon", () => {
  it("can attack an unsuspended opposing Digimon with no digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-016", as: "ikkakumon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "eligible" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ikkakumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("eligible").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("can't use that permission against an unsuspended Digimon with digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-016", as: "ikkakumon" }] },
      1: { battleArea: [{ card: "BT1-010", as: "ineligible", under: ["BT1-001"] }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ikkakumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ineligible").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("does not grant the permission during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-016", as: "ikkakumon" }], hand: ["BT1-009"], deck: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-009", as: "eligible" }], hand: ["BT1-009"], deck: ["BT1-001"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("ikkakumon"))).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ikkakumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("eligible").permanentId },
      }),
    ).toEqual({ ok: false, reason: "not-your-turn" });
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot use the permission against a suspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-016", as: "ikkakumon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "suspended", suspended: true, under: ["BT1-001"] }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ikkakumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("suspended").permanentId },
      }),
    ).toEqual({ ok: true });
  });
});
