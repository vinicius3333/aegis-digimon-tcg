import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-061.js";

describe("EX1-061 Myotismon", () => {
  it("reduces only this field Myotismon's evolution into a Myotismon-named card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-061", as: "base", under: ["EX1-057", "EX1-056"] }],
        hand: [{ card: "EX1-063", as: "evo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-063" && s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });

  it("does not reduce evolution just because Myotismon is in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-057", as: "base", under: ["EX1-056"] }],
        hand: [{ card: "EX1-061", as: "evo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-061" && s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });

  it("does not reduce a matching Myotismon evolution from the breeding area", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX1-061", as: "breedingBase", under: ["EX1-057", "EX1-056"] },
        hand: [{ card: "EX1-063", as: "evo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("breedingBase").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("breedingBase").topCard.cardId === "EX1-063");
    expect(s.state.memory).toBe(1);
  });

  it("lets Retaliation Digimon attack only unsuspended level 4 or lower Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-063", as: "myotismonHost", under: ["EX1-061", "EX1-057", "EX1-056"] },
          { card: "BT2-074", as: "retaliationAttacker" },
        ],
      },
      1: {
        battleArea: [
          { card: "ST1-03", as: "levelThree" },
          { card: "BT6-077", as: "levelFive" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("retaliationAttacker"))).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("retaliationAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("levelFive").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("retaliationAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("levelThree").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("does not grant the inherited attack permission to a non-Myotismon host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-080", as: "nonMyotismonHost", under: ["EX1-061", "EX1-057", "EX1-056"] },
          { card: "BT2-074", as: "retaliationAttacker" },
        ],
      },
      1: { battleArea: [{ card: "ST1-03", as: "levelThree" }] },
    });
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("retaliationAttacker"))).toBe(false);
  });

  it("expires the inherited unsuspended-target permission on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009"],
          battleArea: [
            { card: "EX1-063", as: "myotismonHost", under: ["EX1-061", "EX1-057", "EX1-056"] },
            { card: "BT2-074", as: "retaliationAttacker" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => observe(s.engine).canAttackUnsuspended(s.perm("retaliationAttacker")));
    expect(observe(s.engine).canAttackUnsuspended(s.perm("retaliationAttacker"))).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await settle(() => !observe(s.engine).canAttackUnsuspended(s.perm("retaliationAttacker")));
    expect(observe(s.engine).canAttackUnsuspended(s.perm("retaliationAttacker"))).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("still permits an ordinary attack against a suspended level-5 Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-063", as: "myotismonHost", under: ["EX1-061", "EX1-057", "EX1-056"] },
          { card: "BT2-074", as: "retaliationAttacker", dp: 8000 },
        ],
      },
      1: { battleArea: [{ card: "BT6-077", as: "suspendedLevelFive", suspended: true }] },
    });
    await s.ready();
    const suspendedId = s.perm("suspendedLevelFive").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("retaliationAttacker").permanentId,
        target: { kind: "permanent", permanentId: suspendedId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === suspendedId));
  });
});
