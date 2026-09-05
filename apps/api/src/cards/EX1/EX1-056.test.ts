import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT2/BT2-058.js";
import "./EX1-056.js";

describe("EX1-056 DemiDevimon", () => {
  it("has Retaliation and cannot declare an attack on a Digimon without Myotismon in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-056", as: "demidevimon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("demidevimon"), "Retaliation")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("demidevimon"), "cantAttackDigimon")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cantBeAttacked")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("demidevimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("demidevimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("may attack an opposing Digimon while Myotismon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-056", as: "demidevimon" },
          { card: "EX1-063", as: "myotismon" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("demidevimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("still cannot attack a Digimon when Myotismon is only in the breeding area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-056", as: "demidevimon" }],
        breeding: { card: "EX1-063", as: "breedingMyotismon" },
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("demidevimon"), "cantAttackDigimon")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("demidevimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("can attack a player and resolve Retaliation after a public Blocker response (Q3242)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-056", as: "demidevimon", dp: 1000 }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "BT2-058", as: "blocker" }], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("demidevimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("expires its Digimon-attack restriction during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009"],
          battleArea: [{ card: "EX1-056", as: "demidevimon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("demidevimon"), "cantAttackDigimon")).toBe(true);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("demidevimon"), "cantAttackDigimon")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
