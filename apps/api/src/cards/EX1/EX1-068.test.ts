import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX1-068.js";
import "../BT14/BT14-058.js";
import "../BT14/BT14-086.js";
import "../BT14/BT14-017.js";
import "../BT19/BT19-089.js";

/**
 * A3 — Q1f: EX1-068 (Ice Wall!) [Main] "All of your opponent's Digimon gain '[When Attacking]
 * Lose 2 memory' until the end of their next turn."
 *
 * Same Q1f malformed-`GrantAuraToOpponents`-shape gap as BT6-102/BT15-068/ST15-16/BT12-105 (see
 * BT6-102's header for the full writeup). Proves the SHARED "[When Attacking] Lose 2 memory"
 * library entry (also granted by EX4-018) — KB Q3255 confirms the OPPONENT (the grantee's own
 * controller) loses the memory when the granted Digimon attacks, matching `GainMemory`'s
 * seatless form resolving via `ctx.source.ownerSeat`.
 *
 * FAILS-WHEN-REVERTED: reverting the interpreter's routing branch or the library entry makes
 * the grant install with no effect, so attacking with the recipient never moves memory.
 */

describe('A3 EX1-068 — granted "[When Attacking] Lose 2 memory"', () => {
  it("keeps the timed aura live for opposing Digimon that enter later (Q3256)", () => {
    expect(compiled.effects?.find((effect) => effect.trigger === "Main")?.actions?.[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      includeLaterEntrants: true,
      duration: "untilOpponentTurnEnd",
    });
  });

  it("SECURITY: gains 2 memory for the option's owner", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX1-068", as: "iceWall", faceUp: true }] } });
    s.state.memory = -3;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("iceWall"));

    expect(s.state.memory).toBe(-1);
  });

  it("SECURITY public flow: its owner gains 2 memory after a real security check", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "attacker" }],
        deck: ["BT1-001", "BT1-001", "BT1-001"],
      },
      1: {
        security: [{ card: "EX1-068", as: "iceWallSecurity" }],
        deck: ["BT1-001", "BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        s.events.some(
          (event) =>
            event.kind === "memoryChanged" && event.reason === "gainMemory" && event.from === 3 && event.to === 1,
        ),
    );
    expect(
      s.events.some(
        (event) =>
          event.kind === "memoryChanged" && event.reason === "gainMemory" && event.from === 3 && event.to === 1,
      ),
    ).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("POSITIVE: attacking with the granted opponent Digimon costs its controller 2 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-068", as: "iceWall" }],
          battleArea: [{ card: "AD1-006", dp: 2000, as: "colorSource" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-068"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const before = s.state.memory;
    const attackRes = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    expect(attackRes).toEqual({ ok: true });
    await settle(() =>
      s.events.some((event) => event.kind === "memoryChanged" && event.from === before && event.to === before - 2),
    );
    expect(s.state.players[0]!.security.length).toBe(2);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("NEGATIVE: a Digimon that never received the grant costs no memory when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-068", as: "iceWall" }],
          battleArea: [{ card: "AD1-006", dp: 2000, as: "colorSource" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const before = s.state.memory;
    const attackRes = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    expect(attackRes).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.state.memory).toBe(before);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3256: a Digimon played after Ice Wall still loses memory when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-068", as: "iceWall" }],
          battleArea: [{ card: "AD1-006", as: "blueSource" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          hand: [
            { card: "BT14-058", as: "later" },
            { card: "BT14-086", as: "source" },
          ],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-068"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("later").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("later"), "Rush"));
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("later").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some((event) => event.kind === "memoryChanged" && event.from === before && event.to === before - 2),
    );
    expect(s.state.players[0]!.security.length).toBe(2);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3257: a Blitz attack still pays Ice Wall's memory loss", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-068", as: "iceWall" }],
          battleArea: [{ card: "AD1-006", as: "blueSource" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT14-016", as: "base" }],
          hand: [{ card: "BT14-017", as: "blitz" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-068"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blitz").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some((event) => event.kind === "memoryChanged" && event.from === before && event.to === before - 2),
    );
    expect(s.state.players[0]!.security.length).toBe(2);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3255: two separately resolved Ice Walls stack on the same attacking Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-068", as: "firstIceWall" },
            { card: "EX1-068", as: "secondIceWall" },
          ],
          battleArea: [{ card: "AD1-006", as: "blueSource" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const firstIceWallId = s.inst("firstIceWall").instanceId;
    const secondIceWallId = s.inst("secondIceWall").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: firstIceWallId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === firstIceWallId));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondIceWallId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === secondIceWallId));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    const before = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory" && event.to < before)
          .length >= 2,
    );
    expect(
      s.events.filter(
        (event) =>
          event.kind === "memoryChanged" &&
          event.reason === "gainMemory" &&
          ((event.from === before && event.to === before - 2) ||
            (event.from === before - 2 && event.to === before - 4)),
      ),
    ).toHaveLength(2);
    expect(s.state.players[0]!.security.length).toBe(2);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q2120: the grant expires after the opponent's next turn", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX1-068", as: "iceWall" },
          { card: "BT1-090", as: "ownerAction" },
        ],
        battleArea: [{ card: "AD1-006", as: "blueSource" }],
        deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        security: ["BT1-001", "BT1-001", "BT1-001"],
      },
      1: {
        hand: [{ card: "BT1-090", as: "mainAction" }],
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-009", as: "second" },
          { card: "AD1-006", as: "blueSource" },
        ],
        deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        security: ["BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 10;
    const game = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("iceWall").instanceId));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const firstMemory = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.state.memory).toBe(firstMemory - 2);
    await settle(() => s.state.turnCount >= 3 && s.state.turnSeat === 1);
    await advance(s.engine).waitForMainPhase(1);
    const secondMemory = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.memory).toBe(secondMemory);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await game;
  });

  it("Q2120: Ice Wall starts affecting a Digimon after its earlier Option immunity expires", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-068", as: "iceWall" }],
          battleArea: [{ card: "AD1-006", as: "blueSource" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          hand: [{ card: "BT19-089", as: "immunity" }],
          battleArea: [
            { card: "BT1-009", as: "target" },
            { card: "BT1-085", as: "redTamer" },
          ],
          security: ["BT1-001", "BT1-001", "BT1-001"],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("immunity").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT19-089"));
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-068"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some(
        (event) =>
          event.kind === "memoryChanged" &&
          event.reason === "gainMemory" &&
          event.from === before &&
          event.to === before - 2,
      ),
    );
    expect(s.state.players[0]!.security.length).toBe(2);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q2121: gaining Option immunity after Ice Wall ends the gained effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-068", as: "iceWall" }],
          battleArea: [{ card: "AD1-006", as: "blueSource" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          hand: [{ card: "BT19-089", as: "immunity" }],
          battleArea: [
            { card: "BT1-009", as: "target" },
            { card: "BT1-085", as: "redTamer" },
          ],
          security: ["BT1-001", "BT1-001", "BT1-001"],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-068"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("immunity").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT19-089"));

    const grantedTriggerCount = s.events.filter(
      (event) =>
        event.kind === "effectTriggered" && event.effectKey?.startsWith("granted/[When Attacking] Lose 2 memory"),
    ).length;
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(
      s.events.filter(
        (event) =>
          event.kind === "effectTriggered" && event.effectKey?.startsWith("granted/[When Attacking] Lose 2 memory"),
      ),
    ).toHaveLength(grantedTriggerCount);
    expect(
      s.events.some(
        (event) =>
          event.kind === "memoryChanged" &&
          event.reason === "gainMemory" &&
          event.from === before &&
          event.to === before - 2,
      ),
    ).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
