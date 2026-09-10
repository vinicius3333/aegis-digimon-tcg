import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-041.js";

describe("EX1-041 Dinobeemon", () => {
  it("suspends exactly one opposing Digimon at 5000 DP or less after evolving over Free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-038", as: "base" },
            { card: "BT1-070", as: "ownTarget", dp: 5000 },
          ],
          hand: [{ card: "EX1-041", as: "evo" }],
        },
        1: {
          battleArea: [
            { card: "BT1-070", as: "exactTarget", dp: 5000 },
            { card: "BT1-070", as: "aboveTarget", dp: 5001 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("exactTarget").isSuspended);
    expect(s.perm("exactTarget").isSuspended).toBe(true);
    expect(s.perm("aboveTarget").isSuspended).toBe(false);
    expect(s.perm("ownTarget").isSuspended).toBe(false);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX1-038"]);
    expect(s.state.memory).toBe(2);
  });

  it("does not suspend when the evolution stack has no Free-trait card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-070", as: "base" }], hand: [{ card: "EX1-041", as: "evo" }] },
        1: { battleArea: [{ card: "BT1-070", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-041");
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it.each([
    ["green", "EX1-038"],
    ["blue", "EX1-014"],
  ])(
    "digivolves legally from a %s Lv.4 source, pays 3, draws, and preserves the source",
    async (_color, sourceCard) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: sourceCard, as: "base" }],
          hand: [{ card: "EX1-041", as: "evo" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
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
      await settle(() => s.perm("base").topCard.cardId === "EX1-041");
      expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([sourceCard]);
      expect(s.state.memory).toBe(2);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    },
  );

  it("rejects normal evolution from a non-green/non-blue source without changing state", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "invalidSource" }], hand: [{ card: "EX1-041", as: "evo" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("invalidSource").topCard.cardId).toBe("BT1-009");
    expect(s.perm("invalidSource").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-041"]);
    expect(s.state.memory).toBe(5);
  });

  it("rejects a DNA-evolution intent because Dinobeemon has no DNA requirement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-014", as: "blueMaterial" },
          { card: "EX1-038", as: "greenMaterial" },
        ],
        hand: [{ card: "EX1-041", as: "evo" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blueMaterial").permanentId, s.perm("greenMaterial").permanentId],
        instanceId: s.inst("evo").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX1-014", "EX1-038"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-041"]);
    expect(s.state.memory).toBe(5);
  });

  it("gains 1 memory when an Imperialdramon battle win deletes and survives", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-022", as: "host", under: ["EX1-041"] }],
      },
      1: {
        battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 3000 }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 6);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does not gain memory for a non-Imperialdramon name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-019", as: "nearMatchHost", under: ["EX1-041"] },
          { card: "BT1-070", as: "ownTarget", suspended: true, dp: 3000 },
        ],
      },
      1: { battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 3000 }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nearMatchHost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("is limited to its controller's turn, then re-arms on that controller's next turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-022", as: "imperialHost", under: ["EX1-041"] },
          { card: "BT1-070", as: "victim", suspended: true, dp: 8000 },
        ],
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-070", as: "firstTarget", suspended: true, dp: 3000 },
          { card: "BT1-070", as: "opponentAttacker", dp: 10000 },
        ],
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-009", "BT1-010"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("victim").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("imperialHost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.memory === 6);
    expect(s.state.memory).toBe(6);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(5);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("imperialHost").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("imperialHost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponentAttacker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 6);
    expect(s.state.memory).toBe(6);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not gain memory when the Imperialdramon host loses the battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-022", as: "host", under: ["EX1-041"], dp: 6000 }] },
      1: { battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 10000 }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.memory).toBe(5);
  });
});
