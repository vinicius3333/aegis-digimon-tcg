import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-075.js";
import "../BT8/BT8-104.js";
import "../ST1/ST1-07.js";
import "../ST9/ST9-13.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-029.js";
import "../BT1/BT1-066.js";
import "./EX1-038.js";

describe("EX1-038 Stingmon", () => {
  it("performs a real Piercing security check after deleting an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-038", as: "stingmon" }] },
      1: {
        battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 4000 }],
        security: ["BT1-009", "BT1-009"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("stingmon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("stingmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("grants inherited Piercing to a legal Imperialdramon stack and performs the check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-022", as: "host", under: ["EX1-038", "EX1-041"] }] },
      1: {
        battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 4000 }],
        security: ["BT1-009", "BT1-009"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("grants inherited Piercing only to Free traits or an Imperialdramon name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST9-13", as: "freeHost", under: ["EX1-038"] },
          { card: "BT3-111", as: "imperialNameHost", under: ["EX1-038"] },
          { card: "BT1-075", as: "nonMatchingHost", under: ["EX1-038"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("freeHost"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("imperialNameHost"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("nonMatchingHost"))).toBe(false);
  });

  it("keeps checking after losing Piercing while Security Attack +1 remains (Q3225)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST9-13", as: "freeHost", under: ["ST1-07", "EX1-038", "BT1-075"] }],
        },
        1: {
          battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 3000 }],
          security: ["BT8-104", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.perm("freeHost").topCard.cardId).toBe("ST9-13");
    expect(observe(s.engine).hasPierce(s.perm("freeHost"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("freeHost"), "SecurityAttack")).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("freeHost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.perm("freeHost").topCard.cardId).toBe("BT1-075");
    expect(observe(s.engine).hasPierce(s.perm("freeHost"))).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("freeHost"), "SecurityAttack")).toBe(1);
  });

  it("stops the next Piercing check when De-Digivolve removes Security Attack +1 (Q3225)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST9-13", as: "freeHost", under: ["EX1-038", "BT1-075"] }],
        },
        1: {
          battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 3000 }],
          security: ["BT8-104", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("freeHost"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("freeHost"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("freeHost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("freeHost").topCard.cardId).toBe("BT1-075");
    expect(observe(s.engine).hasPierce(s.perm("freeHost"))).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("freeHost"), "SecurityAttack")).toBe(0);
  });

  it("does not grant inherited Piercing outside your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-022", as: "host", under: ["EX1-038", "EX1-041"] }],
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-012"],
        security: ["BT1-009", "BT1-009"],
      },
      1: {
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-012"],
        security: ["BT1-009", "BT1-009"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("limits the inherited grant to the host controller's turn", async () => {
    const s = setupEngine({
      0: { hand: ["BT1-009"], deck: ["BT1-009"] },
      1: {
        battleArea: [{ card: "ST9-13", as: "opponentHost", under: ["EX1-038"] }],
        hand: ["BT1-009"],
        deck: ["BT1-009"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("opponentHost"))).toBe(false);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasPierce(s.perm("opponentHost"))).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    ["blue", "BT1-029"],
    ["green", "BT1-066"],
  ])("digivolves legally from a %s level-3 source and preserves the source", async (_color, sourceCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: sourceCard, as: "source" }],
        hand: [{ card: "EX1-038", as: "evo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("source").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX1-038");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual([sourceCard]);
    expect(s.state.memory).toBe(8);
    expect(observe(s.engine).hasPierce(s.perm("source"))).toBe(true);
  });

  it("rejects evolution from an off-color level-3 source without changing state", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "invalidSource" }],
        hand: [{ card: "EX1-038", as: "evo" }],
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
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-038"]);
  });
});
