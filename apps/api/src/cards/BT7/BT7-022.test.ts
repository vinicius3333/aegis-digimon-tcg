import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-022.js";
import "../BT1/BT1-086.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-085.js";
import "../BT18/BT18-089.js";

describe("BT7-022 KendoGarurumon", () => {
  it("digivolves onto a blue Tamer for the printed fixed cost of 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-087", as: "base" }], hand: [{ card: "BT7-022", as: "evolving" }] },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Jamming"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("BT7-022");
  });

  it("gains Jamming when it has a Hybrid source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-021", as: "base" }], hand: [{ card: "BT7-022", as: "evolving" }] },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Jamming"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(true);
  });
});

function digivolveKendoOnto(s: EngineSetup, baseAlias: string) {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(baseAlias).permanentId,
    instanceId: s.inst("kendo").instanceId,
  });
}

function attackPlayer(s: EngineSetup, attackerAlias: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm(attackerAlias).permanentId,
    target: { kind: "player" },
  });
}

describe("BT7-022 KendoGarurumon — KB Q&A rulings", () => {
  it.fails("treats the Tamer as a Digimon that digivolves: digivolve triggers fire and a can't-digivolve lock blocks it (Q1530)", async () => {
    const digimonTriggered = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-028", as: "elecmon" },
            { card: "BT16-085", as: "davisAndKen" },
          ],
          hand: [{ card: "BT7-022", as: "kendo" }],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    digimonTriggered.state.memory = 3;
    await digimonTriggered.ready();
    expect(digivolveKendoOnto(digimonTriggered, "elecmon")).toEqual({ ok: true });
    await settle(() => digimonTriggered.perm("davisAndKen").isSuspended && digimonTriggered.state.memory === 1);

    const digimonLocked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [{ card: "BT1-028", as: "elecmon" }],
        hand: [{ card: "BT7-022", as: "kendo" }],
        deck: ["BT1-001"],
      },
    });
    digimonLocked.state.memory = 3;
    await digimonLocked.ready();
    expect(digivolveKendoOnto(digimonLocked, "elecmon")).toMatchObject({ ok: false });

    const triggered = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-086", as: "tamer" },
            { card: "BT16-085", as: "davisAndKen" },
          ],
          hand: [{ card: "BT7-022", as: "kendo" }],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    triggered.state.memory = 3;
    await triggered.ready();

    expect(digivolveKendoOnto(triggered, "tamer")).toEqual({ ok: true });
    await settle(() => triggered.perm("davisAndKen").isSuspended && triggered.state.memory === 2);

    expect(triggered.perm("tamer").topCard?.cardId).toBe("BT7-022");
    expect(triggered.perm("davisAndKen").isSuspended).toBe(true);
    expect(triggered.state.memory).toBe(2);

    const locked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT7-022", as: "kendo" }],
        deck: ["BT1-001"],
      },
    });
    locked.state.memory = 3;
    await locked.ready();

    expect(digivolveKendoOnto(locked, "tamer")).toMatchObject({ ok: false });
    expect(locked.perm("tamer").topCard?.cardId).toBe("BT1-086");
    expect(locked.state.memory).toBe(3);
  });

  it("performs the digivolution bonus draw when digivolving onto a Tamer (Q1531)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT7-022", as: "kendo" }],
        deck: [{ card: "BT1-001", as: "drawn" }, "BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(digivolveKendoOnto(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("tamer").topCard?.cardId).toBe("BT7-022");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a Tamer played that same turn (Q1532)", async () => {
    const digivolvedBoard = async (enteredThisTurn: boolean) => {
      const board = setupEngine({
        0: {
          battleArea: [{ card: "BT1-086", as: "tamer", enteredThisTurn }],
          hand: [{ card: "BT7-022", as: "kendo" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: { security: ["BT1-001", "BT1-001"], deck: ["BT1-001", "BT1-001"] },
      });
      board.state.memory = 3;
      await board.ready();
      expect(digivolveKendoOnto(board, "tamer")).toEqual({ ok: true });
      await settle(() => board.perm("tamer").topCard?.cardId === "BT7-022");
      return board;
    };

    const freshTamer = await digivolvedBoard(true);
    expect(attackPlayer(freshTamer, "tamer")).toMatchObject({ ok: false });
    expect(freshTamer.perm("tamer").isSuspended).toBe(false);
    expect(freshTamer.state.players[1]!.security).toHaveLength(2);

    const establishedTamer = await digivolvedBoard(false);
    expect(attackPlayer(establishedTamer, "tamer")).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card and trashes it when the Digimon leaves the field (Q1533)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT7-022", as: "kendo" }],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(digivolveKendoOnto(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-022");
    const tamerCardId = s.perm("tamer").stack[0]!.instanceId;
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-086"]);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId])).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [tamerCardId, s.inst("kendo").instanceId].sort(),
    );
  });

  it("does not grant the Tamer's [Security] effect to the Digimon it sits under (Q1534)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-086", as: "matt" }],
          hand: [{ card: "BT7-022", as: "kendo" }],
          deck: ["BT1-001", "BT1-001"],
          security: [{ card: "BT1-086", as: "securityMatt" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(digivolveKendoOnto(s, "matt")).toEqual({ ok: true });
    await settle(() => s.perm("matt").topCard?.cardId === "BT7-022");
    const buriedMattId = s.perm("matt").stack[0]!.instanceId;

    // Opening a [Security] window on the whole stack also collects the buried Tamer's effects,
    // so only the ruling keeps its "play this card" effect from firing.
    await advance(s.engine).fireForPermanent(EffectTiming.SecuritySkill, s.perm("matt"));
    await drainMicrotasks();

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("matt").topCard?.cardId).toBe("BT7-022");
    expect(s.perm("matt").stack.map((card) => card.instanceId)).toEqual([buriedMattId]);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityMatt"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("securityMatt").instanceId,
    );
  });

  it("gains the inherited effect printed on a Tamer in its digivolution cards (Q1535)", async () => {
    const attackWithKendoOnto = async (tamerCardId: string) => {
      const board = setupEngine(
        {
          0: {
            battleArea: [{ card: tamerCardId, as: "tamer" }],
            hand: [{ card: "BT7-022", as: "kendo" }],
            deck: ["BT1-001", "BT1-001", "BT1-001"],
          },
          1: {
            battleArea: [{ card: "BT1-009", under: ["BT1-001", "BT1-002"], as: "target" }],
            security: ["BT1-001", "BT1-001"],
            deck: ["BT1-001", "BT1-001"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      board.state.memory = 3;
      await board.ready();

      expect(digivolveKendoOnto(board, "tamer")).toEqual({ ok: true });
      await settle(() => board.perm("tamer").topCard?.cardId === "BT7-022");
      expect(attackPlayer(board, "tamer")).toEqual({ ok: true });
      await settle(() => board.state.players[1]!.security.length === 1, 5000);
      await drainMicrotasks();
      return board.perm("target").stack.map((card) => card.cardId);
    };

    expect(await attackWithKendoOnto("BT18-089")).toEqual(["BT1-002"]);
    expect(await attackWithKendoOnto("BT1-086")).toEqual(["BT1-001", "BT1-002"]);
  });
  it("cannot be declared without a card it can digivolve onto, and once declared the digivolution cannot be declined (Q4641)", async () => {
    const noValidBase = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-085", as: "redTamer" },
          { card: "BT1-010", as: "redRookie" },
        ],
        hand: [{ card: "BT7-022", as: "kendo" }],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    noValidBase.state.memory = 3;
    await noValidBase.ready();

    expect(digivolveKendoOnto(noValidBase, "redTamer")).toMatchObject({ ok: false });
    expect(digivolveKendoOnto(noValidBase, "redRookie")).toMatchObject({ ok: false });
    expect(noValidBase.state.memory).toBe(3);
    expect(noValidBase.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      noValidBase.inst("kendo").instanceId,
    ]);

    const blueTamer = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT7-022", as: "kendo" }],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    blueTamer.state.memory = 3;
    await blueTamer.ready();

    expect(digivolveKendoOnto(blueTamer, "tamer")).toEqual({ ok: true });
    await settle(() => blueTamer.perm("tamer").topCard?.cardId === "BT7-022");

    expect(blueTamer.state.pendingDecision).toBeUndefined();
    expect(blueTamer.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-086"]);
    expect(blueTamer.state.memory).toBe(1);
  });
});
