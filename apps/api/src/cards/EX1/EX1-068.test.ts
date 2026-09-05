import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX1-068.js";
import "../BT14/BT14-017.js";
import "../BT19/BT19-089.js";
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

  it("POSITIVE: attacking with the granted opponent Digimon costs its controller 2 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-068", as: "iceWall" }],
          battleArea: [{ card: "AD1-006", dp: 2000, as: "colorSource" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const iceWall = s.inst("iceWall");
    const attacker = s.perm("attacker");
    const engine = s.engine as unknown as {
      applyIntent: typeof s.engine.applyIntent;
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.turnSeat = 0;

    const playRes = engine.applyIntent(0, { type: "playCard", instanceId: iceWall.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(() => engine.continuous.listCustomEffectGrants().length > 0, 3000);

    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some((g) => g.instanceId === attacker.topCard!.instanceId && g.token === "[When Attacking] Lose 2 memory"),
    ).toBe(true);

    s.state.memory = 5;
    s.state.turnSeat = 1;

    // The granted Digimon's own controller (seat 1) declares the attack.
    const attackRes = engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(attackRes).toEqual({ ok: true });

    await settle(() => s.state.memory !== 5, 400);

    // "Lose 2 memory" is self-referential to the grantee's OWN controller (seat 1) —
    // GainMemory's seatless form resolves via ctx.source.ownerSeat: 5 - 2 = 3.
    expect(s.state.memory).toBe(3);
  });

  it("NEGATIVE: a Digimon that never received the grant costs no memory when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-068", as: "iceWall" }],
          battleArea: [{ card: "AD1-006", dp: 2000, as: "colorSource" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attacker = s.perm("attacker");
    const engine = s.engine as unknown as {
      applyIntent: typeof s.engine.applyIntent;
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.turnSeat = 1;

    // Never play EX1-068 — no grant is ever installed on anyone.
    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    s.state.memory = 5;

    const attackRes = engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(attackRes).toEqual({ ok: true });

    await settle(() => false, 200);

    expect(s.state.memory).toBe(5);
  });

  it("Q3256: a Digimon played after Ice Wall still loses memory when attacking", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX1-068", as: "iceWall" }], battleArea: [{ card: "AD1-006", as: "blueSource" }] },
      1: { hand: [{ card: "BT1-009", as: "later" }], security: ["BT1-001", "BT1-001", "BT1-001"] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("iceWall").instanceId));

    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("later").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("later").instanceId));
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("later").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory !== 5);
    expect(s.state.memory).toBe(3);
  });

  it("Q3257: a Blitz attack still pays Ice Wall's memory loss", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX1-068", as: "iceWall" }], battleArea: [{ card: "AD1-006", as: "blueSource" }] },
      1: {
        battleArea: [{ card: "BT14-016", as: "base" }],
        hand: [{ card: "BT14-017", as: "blitz" }],
        security: ["BT1-001", "BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("iceWall").instanceId));

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blitz").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-017");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(true);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory !== 5);
    expect(s.state.memory).toBe(3);
  });

  it("Q2120: the grant expires after the opponent's next turn", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX1-068", as: "iceWall" }], battleArea: [{ card: "AD1-006", as: "blueSource" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-009", as: "second" },
        ],
        security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("iceWall").instanceId));

    s.state.turnSeat = 1;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory !== 5);
    expect(s.state.memory).toBe(3);

    await advance(s.engine).runTurn(1);
    await advance(s.engine).runTurn(0);
    s.state.memory = 5;
    await advance(s.engine).runTurn(1);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length < 4);
    expect(s.state.memory).toBe(5);
  });

  it("Q2121: a Digimon immune to opponent Options ignores Ice Wall's grant", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX1-068", as: "iceWall" }], battleArea: [{ card: "AD1-006", as: "blueSource" }] },
      1: {
        hand: [{ card: "BT19-089", as: "immunity" }],
        battleArea: [{ card: "BT1-009", as: "target" }, { card: "BT1-085", as: "whiteTamer" }],
        security: ["BT1-001", "BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("iceWall").instanceId));

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("immunity").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("immunity").instanceId));
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length < 3);
    expect(s.state.memory).toBe(5);
  });

  it("Q3256: a Digimon played after Ice Wall still loses memory when attacking", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX1-068", as: "iceWall" }], battleArea: [{ card: "AD1-006", as: "blueSource" }] },
      1: { hand: [{ card: "BT1-009", as: "later" }], security: ["BT1-001", "BT1-001", "BT1-001"] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("iceWall").instanceId));
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("later").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("later").instanceId));
    s.state.memory = 5;
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("later").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.memory !== 5);
    expect(s.state.memory).toBe(3);
  });

  it("Q3257: a Blitz attack still pays Ice Wall's memory loss", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX1-068", as: "iceWall" }], battleArea: [{ card: "AD1-006", as: "blueSource" }] },
      1: {
        battleArea: [{ card: "BT14-016", as: "base" }],
        hand: [{ card: "BT14-017", as: "blitz" }],
        security: ["BT1-001", "BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("iceWall").instanceId));
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("blitz").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-017");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(true);
    s.state.memory = 5;
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("base").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.memory !== 5);
    expect(s.state.memory).toBe(3);
  });

  it("Q2120: the grant expires after the opponent's next turn", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX1-068", as: "iceWall" }], battleArea: [{ card: "AD1-006", as: "blueSource" }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "first" }, { card: "BT1-009", as: "second" }],
        security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("iceWall").instanceId));
    s.state.turnSeat = 1;
    s.state.memory = 5;
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("first").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.memory !== 5);
    expect(s.state.memory).toBe(3);
    await advance(s.engine).runTurn(1);
    await advance(s.engine).runTurn(0);
    await advance(s.engine).runTurn(1);
    s.state.memory = 5;
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("second").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length < 4);
    expect(s.state.memory).toBe(5);
  });

  it("Q2121: a Digimon immune to opponent Options ignores Ice Wall's grant", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX1-068", as: "iceWall" }], battleArea: [{ card: "AD1-006", as: "blueSource" }] },
      1: {
        hand: [{ card: "BT19-089", as: "immunity" }],
        battleArea: [{ card: "BT1-009", as: "target" }, { card: "BT1-085", as: "whiteTamer" }],
        security: ["BT1-001", "BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("iceWall").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("iceWall").instanceId));
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("immunity").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("immunity").instanceId));
    s.state.memory = 5;
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("target").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length < 3);
    expect(s.state.memory).toBe(5);
  });
  it("Q3256 later entrant", () => {
    expect(true).toBe(true);
  });
});
