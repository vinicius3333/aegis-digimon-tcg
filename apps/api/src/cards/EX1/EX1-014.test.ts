import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-014.js";

describe("EX1-014 ExVeemon", () => {
  it("has Jamming as its main keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-014", as: "exveemon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("exveemon"), "Jamming")).toBe(true);
  });

  it("grants inherited Jamming to Free and Imperialdramon-name hosts, but not a near-match", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-019", as: "freeHost", under: ["EX1-014"] },
          { card: "BT3-111", as: "imperialNameOnly", under: ["EX1-014"] },
          { card: "EX1-015", as: "vaccineNearMatch", under: ["EX1-014"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("freeHost"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("imperialNameOnly"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("vaccineNearMatch"), "Jamming")).toBe(false);
  });

  it("survives a losing security battle through real Jamming behavior", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-014", as: "exveemon" }] },
      1: { security: ["BT1-020"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("exveemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.events.find((event) => event.kind === "securityChecked")).toMatchObject({
      battle: { attackerDeleted: true },
    });
  });

  it("does not grant inherited Jamming outside your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-019", as: "freeHost", under: ["EX1-014"] }],
        hand: ["BT1-009"],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-070" }], hand: ["BT1-009"], deck: ["BT1-009"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("freeHost"), "Jamming")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("limits the inherited grant to the host controller's turn", async () => {
    const s = setupEngine({
      0: { hand: ["BT1-009"], deck: ["BT1-009"] },
      1: {
        battleArea: [{ card: "EX1-019", as: "opponentHost", under: ["EX1-014"] }],
        hand: ["BT1-009"],
        deck: ["BT1-009"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("opponentHost"), "Jamming")).toBe(false);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("opponentHost"), "Jamming")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    ["blue", "EX1-013"],
    ["green", "BT1-064"],
  ])("digivolves legally from a %s level-3 source and retains that source", async (_color, sourceCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: sourceCard, as: "source" }],
        hand: [{ card: "EX1-014", as: "evo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX1-014");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual([sourceCard]);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Jamming")).toBe(true);
  });

  it("rejects an illegal off-color level-3 evolution without changing the stack or memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "invalidSource" }],
        hand: [{ card: "EX1-014", as: "evo" }],
      },
    });
    s.state.memory = 10;
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
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX1-014");
  });
});
