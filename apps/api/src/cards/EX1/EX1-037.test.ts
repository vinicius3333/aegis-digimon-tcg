import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-037.js";

describe("EX1-037 Kuwagamon", () => {
  it("suspends an opposing Digimon with 3000 DP or less at start of your turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-037", as: "kuwagamon" }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-066", as: "at3000", dp: 3000 },
            { card: "BT1-070", as: "above3000", dp: 4000 },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("at3000").isSuspended).toBe(true);
    expect(s.perm("above3000").isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("restricts a suspended opposing Digimon after its inherited host wins a real battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-040", as: "host", under: ["EX1-037"] }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-066", as: "battleTarget", dp: 3000, suspended: true },
            { card: "BT1-070", as: "restrictedTarget", suspended: true },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const battleTargetId = s.perm("battleTarget").permanentId;
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: battleTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === battleTargetId) &&
        observe(s.engine).isRestricted(s.perm("restrictedTarget"), "unsuspend"),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("restrictedTarget"), "unsuspend")).toBe(true);
    expect(s.perm("restrictedTarget").isSuspended).toBe(true);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("restrictedTarget").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.perm("restrictedTarget").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("restrictedTarget").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("restrictedTarget"), "unsuspend")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not apply the inherited restriction when another Digimon wins the battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-040", as: "host", under: ["EX1-037"] },
            { card: "BT1-070", as: "otherAttacker", dp: 4000 },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-066", as: "battleTarget", dp: 3000, suspended: true },
            { card: "BT1-070", as: "unrelated", suspended: true },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    await s.ready();
    const battleTargetId = s.perm("battleTarget").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherAttacker").permanentId,
        target: { kind: "permanent", permanentId: battleTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === battleTargetId));
    expect(observe(s.engine).isRestricted(s.perm("unrelated"), "unsuspend")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not apply the inherited restriction when the host loses the battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-040", as: "host", under: ["EX1-037"], dp: 6000 }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-066", as: "battleTarget", dp: 10000, suspended: true },
            { card: "BT1-070", as: "unrelated", suspended: true },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(observe(s.engine).isRestricted(s.perm("unrelated"), "unsuspend")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the inherited watcher through legal green evolution and rejects a red source", async () => {
    const legal = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-068", as: "base" }],
          hand: [
            { card: "EX1-037", as: "evo" },
            { card: "EX1-040", as: "host" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-066", as: "battleTarget", dp: 3000, suspended: true },
            { card: "BT1-070", as: "restrictedTarget", dp: 4000, suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    legal.state.memory = 5;
    await legal.ready();
    const permanentId = legal.perm("base").permanentId;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: legal.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === "EX1-037");
    expect(legal.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-068"]);
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: legal.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === "EX1-040");
    expect(legal.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-068", "EX1-037"]);
    expect(
      legal.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "permanent", permanentId: legal.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        legal.state.players[1]!.battleArea.length === 1 &&
        observe(legal.engine).isRestricted(legal.perm("restrictedTarget"), "unsuspend"),
    );
    expect(legal.state.players[0]!.battleArea).toHaveLength(1);
    expect(legal.perm("restrictedTarget").isSuspended).toBe(true);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "redSource" }],
        hand: [{ card: "EX1-037", as: "evo" }],
      },
    });
    illegal.state.memory = 5;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("redSource").permanentId,
        instanceId: illegal.inst("evo").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(illegal.perm("redSource").topCard.cardId).toBe("BT1-009");
    expect(illegal.perm("redSource").stack).toHaveLength(0);
    expect(illegal.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-037"]);
    expect(illegal.state.memory).toBe(5);
  });
});
