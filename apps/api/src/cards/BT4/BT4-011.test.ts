import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT4-011.js";
import "../BT12/BT12-088.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-084.js";
import "../BT16/BT16-027.js";
import "../BT16/BT16-028.js";
import "../BT20/BT20-078.js";
import "../BT5/BT5-007.js";
import "../BT5/BT5-092.js";
import "../BT8/BT8-059.js";
import "../EX2/EX2-070.js";
import "../EX3/EX3-016.js";
import "../EX3/EX3-019.js";
import "../EX3/EX3-053.js";

describe("BT4-011 Agunimon", () => {
  it("digivolves from hand onto a red Tamer for 2 memory and draws the bonus", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "tamer" }],
        hand: [{ card: "BT4-011", as: "aguni" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("aguni").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT4-011" && s.state.memory === 1);

    expect(s.perm("tamer").topCard?.cardId).toBe("BT4-011");
    expect(s.perm("tamer").stack[0]?.cardId).toBe("BT1-085");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
  });

  it("cannot use a non-red Tamer as its alternate digivolution base", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT4-011", as: "aguni" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("aguni").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("tamer").topCard?.cardId).toBe("BT1-086");
  });
});

function digivolveOntoTamer(s: EngineSetup, tamerAlias: string, agunimonAlias = "aguni") {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(tamerAlias).permanentId,
    instanceId: s.inst(agunimonAlias).instanceId,
  });
}

function opponentDigivolvesTamerUnder(sourceDigimonId: string | null, tamerUnder: string[]) {
  const s = setupEngine({
    0: {
      battleArea: sourceDigimonId ? [{ card: "EX3-017", under: [sourceDigimonId], as: "host" }] : [],
    },
    1: {
      battleArea: [{ card: "BT1-085", under: tamerUnder, as: "tamer" }],
      hand: [{ card: "BT4-011", as: "aguni" }],
      deck: ["BT1-030"],
    },
  });
  s.state.turnSeat = 1;
  s.state.memory = -3;
  return s;
}

function digivolveOpponentTamerIntent(s: EngineSetup, tamerAlias: string, agunimonAlias: string) {
  return s.engine.applyIntent(1, {
    type: "digivolve",
    permanentId: s.perm(tamerAlias).permanentId,
    instanceId: s.inst(agunimonAlias).instanceId,
  });
}

async function digivolveOpponentTamer(s: EngineSetup) {
  await s.ready();
  expect(
    s.engine.applyIntent(1, {
      type: "digivolve",
      permanentId: s.perm("tamer").permanentId,
      instanceId: s.inst("aguni").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("tamer").topCard?.cardId === "BT4-011");
  return s.state.memory;
}

describe("BT4-011 Agunimon — KB Q&A rulings", () => {
  it("treats the Tamer as a Digimon that digivolves: digivolve triggers fire and a can't-digivolve lock blocks it (Q1157)", async () => {
    const triggered = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-085", as: "tamer" },
            { card: "BT16-084", as: "yolei" },
          ],
          hand: [{ card: "BT4-011", as: "aguni" }],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    triggered.state.memory = 3;
    await triggered.ready();

    expect(digivolveOntoTamer(triggered, "tamer")).toEqual({ ok: true });
    await settle(() => triggered.perm("yolei").isSuspended && triggered.state.memory === 2);

    expect(triggered.perm("tamer").topCard?.cardId).toBe("BT4-011");
    expect(triggered.perm("yolei").isSuspended).toBe(true);
    expect(triggered.state.memory).toBe(2);

    const locked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [{ card: "BT1-085", as: "tamer" }],
        hand: [{ card: "BT4-011", as: "aguni" }],
        deck: ["BT1-001"],
      },
    });
    locked.state.memory = 3;
    await locked.ready();

    expect(digivolveOntoTamer(locked, "tamer")).toMatchObject({ ok: false });
    expect(locked.perm("tamer").topCard?.cardId).toBe("BT1-085");
    expect(locked.state.memory).toBe(3);
  });

  it("performs the digivolution bonus draw when digivolving onto a Tamer (Q1158)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "tamer" }],
        hand: [{ card: "BT4-011", as: "aguni" }],
        deck: [{ card: "BT1-001", as: "drawn" }, "BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("tamer").topCard?.cardId).toBe("BT4-011");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a Tamer played that same turn (Q1159)", async () => {
    const buildBoard = (enteredThisTurn: boolean) =>
      setupEngine({
        0: {
          battleArea: [{ card: "BT1-085", as: "tamer", enteredThisTurn }],
          hand: [{ card: "BT4-011", as: "aguni" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: { security: ["BT1-001", "BT1-001"], deck: ["BT1-001", "BT1-001"] },
      });

    const freshTamer = buildBoard(true);
    freshTamer.state.memory = 3;
    await freshTamer.ready();
    expect(digivolveOntoTamer(freshTamer, "tamer")).toEqual({ ok: true });
    await settle(() => freshTamer.perm("tamer").topCard?.cardId === "BT4-011");

    expect(
      freshTamer.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: freshTamer.perm("tamer").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(freshTamer.perm("tamer").isSuspended).toBe(false);
    expect(freshTamer.state.players[1]!.security).toHaveLength(2);

    const establishedTamer = buildBoard(false);
    establishedTamer.state.memory = 3;
    await establishedTamer.ready();
    expect(digivolveOntoTamer(establishedTamer, "tamer")).toEqual({ ok: true });
    await settle(() => establishedTamer.perm("tamer").topCard?.cardId === "BT4-011");

    expect(
      establishedTamer.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: establishedTamer.perm("tamer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card and trashes it when the Digimon is deleted (Q1160)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "tamer" }],
          hand: [{ card: "BT4-011", as: "aguni" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "AD1-001", as: "wall", dp: 9000, suspended: true }],
          security: ["BT1-001"],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT4-011");
    const agunimonId = s.perm("tamer").permanentId;
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-085"]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: agunimonId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== agunimonId), 5000);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-085", "BT4-011"]);
  });

  it("does not grant the Tamer's [Security] effect to the Digimon it sits under (Q1161)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          hand: [{ card: "BT4-011", as: "aguni" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: {
          security: [{ card: "BT12-088", as: "opponentTakuya" }, "BT1-001"],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(digivolveOntoTamer(s, "takuya")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT4-011");
    const buriedTakuyaId = s.perm("takuya").stack[0]!.instanceId;

    // Opening a [Security] window on the whole stack collects the buried Tamer's effects too,
    // so only the ruling keeps its "play this card" effect from firing.
    await advance(s.engine).fireForPermanent(EffectTiming.SecuritySkill, s.perm("takuya"));
    await drainMicrotasks();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual([buriedTakuyaId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("takuya").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT12-088"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("takuya").topCard?.cardId).toBe("BT4-011");
    expect(s.perm("takuya").stack.map((card) => card.cardId)).toEqual(["BT12-088"]);
  });

  it("gains the inherited effect printed on a Tamer in its digivolution cards (Q1162)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-088", as: "takuya" },
          { card: "BT1-085", as: "tai" },
        ],
        hand: [
          { card: "BT4-011", as: "aguni" },
          { card: "BT4-011", as: "otherAguni" },
        ],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(digivolveOntoTamer(s, "takuya")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT4-011");
    expect(digivolveOntoTamer(s, "tai", "otherAguni")).toEqual({ ok: true });
    await settle(() => s.perm("tai").topCard?.cardId === "BT4-011" && s.perm("takuya").currentDP === 7000);

    expect(s.perm("takuya").currentDP).toBe(7000);
    expect(s.perm("tai").currentDP).toBe(5000);
  });
  it("trashes the Tamer card under it when the Digimon is deleted by an effect (Q1163)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "tamer" }],
        hand: [{ card: "BT4-011", as: "aguni" }],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT4-011");
    const tamerCardId = s.perm("tamer").stack[0]!.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId])).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([tamerCardId, s.inst("aguni").instanceId]),
    );
  });

  it("can still digivolve onto a red Tamer while players can't ignore digivolution requirements (Q1743)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-059", as: "kokuwamon" },
          { card: "BT1-085", as: "tamer" },
        ],
        hand: [{ card: "BT4-011", as: "aguni" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.continuous.cannotIgnoreDigivolution(0)).toBe(true);

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT4-011" && s.state.memory === 1);

    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-085"]);
    expect(s.state.memory).toBe(1);
  });

  it("does not trigger an opponent's when-an-effect-digivolves [All Turns] effect (Q2624)", async () => {
    const buildBoard = () =>
      setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT16-028", as: "dragonMode" },
              { card: "BT1-087", as: "ownTamer" },
            ],
            hand: [{ card: "BT16-027", as: "fighterMode" }],
          },
          1: {
            battleArea: [
              { card: "BT1-085", as: "tamer" },
              { card: "BT5-007", as: "fieldAgumon" },
            ],
            hand: [
              { card: "BT4-011", as: "aguni" },
              { card: "BT5-092", as: "nokia" },
              { card: "BT5-007", as: "agumon" },
              { card: "EX2-070", as: "plugIn" },
            ],
            deck: ["BT1-001", "BT1-002", "BT1-003"],
          },
        },
        { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
      );
    const opponentTurnBoard = async () => {
      const board = buildBoard();
      board.state.turnSeat = 1;
      board.state.memory = 3;
      await board.ready();
      return board;
    };

    const agunimonRule = await opponentTurnBoard();
    expect(
      agunimonRule.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: agunimonRule.perm("tamer").permanentId,
        instanceId: agunimonRule.inst("aguni").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => agunimonRule.perm("tamer").topCard?.cardId === "BT4-011");
    await drainMicrotasks();

    expect(agunimonRule.perm("dragonMode").topCard?.cardId).toBe("BT16-028");
    expect(
      agunimonRule.state.players[0]!.hand.some(
        (card) => card.instanceId === agunimonRule.inst("fighterMode").instanceId,
      ),
    ).toBe(true);

    const effectDigivolve = await opponentTurnBoard();
    expect(
      effectDigivolve.engine.applyIntent(1, {
        type: "playCard",
        instanceId: effectDigivolve.inst("plugIn").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => effectDigivolve.perm("dragonMode").topCard?.cardId === "BT16-027");
    expect(
      effectDigivolve.state.players[1]!.hand.some(
        (card) => card.instanceId === effectDigivolve.inst("aguni").instanceId,
      ),
    ).toBe(false);
    expect(effectDigivolve.perm("dragonMode").topCard?.cardId).toBe("BT16-027");

    const effectPlay = await opponentTurnBoard();
    expect(
      effectPlay.engine.applyIntent(1, { type: "playCard", instanceId: effectPlay.inst("nokia").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => effectPlay.perm("dragonMode").topCard?.cardId === "BT16-027");
    expect(effectPlay.perm("dragonMode").topCard?.cardId).toBe("BT16-027");
  });

  it("pays 1 more when the opponent's inherited SnowAgumon sees a Tamer with no cards under it (Q3382)", async () => {
    expect(await digivolveOpponentTamer(opponentDigivolvesTamerUnder(null, []))).toBe(-5);
    expect(await digivolveOpponentTamer(opponentDigivolvesTamerUnder("EX3-016", []))).toBe(-6);
  });

  it("does not pay more when the red Tamer already has a card under it (Q3383)", async () => {
    expect(await digivolveOpponentTamer(opponentDigivolvesTamerUnder("EX3-016", ["BT1-009"]))).toBe(-5);
    expect(await digivolveOpponentTamer(opponentDigivolvesTamerUnder("EX3-016", []))).toBe(-6);
  });

  it("pays 1 more when the opponent's inherited Paledramon sees a Tamer with no cards under it (Q3389)", async () => {
    expect(await digivolveOpponentTamer(opponentDigivolvesTamerUnder(null, []))).toBe(-5);
    expect(await digivolveOpponentTamer(opponentDigivolvesTamerUnder("EX3-019", []))).toBe(-6);
  });
  it("does not raise the cost when the opponent's red Tamer has cards under it and my Digimon inherits Paledramon (Q3390)", async () => {
    expect(await digivolveOpponentTamer(opponentDigivolvesTamerUnder("EX3-019", ["BT1-009"]))).toBe(-5);
    expect(await digivolveOpponentTamer(opponentDigivolvesTamerUnder("EX3-019", []))).toBe(-6);
  });

  it("cannot digivolve onto an unsuspended red Tamer in the turn after Metallicdramon's [On Play] (Q3422)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-053", as: "metallicdramon" }],
          deck: ["BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-085", as: "unsuspendedTamer" },
            { card: "BT1-085", as: "suspendedTamer" },
          ],
          hand: [
            { card: "BT4-011", as: "aguni" },
            { card: "BT4-011", as: "otherAguni" },
          ],
          deck: ["BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metallicdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("unsuspendedTamer").isSuspended).toBe(false);

    expect(digivolveOpponentTamerIntent(s, "unsuspendedTamer", "aguni")).toMatchObject({ ok: false });
    expect(s.perm("unsuspendedTamer").topCard?.cardId).toBe("BT1-085");

    // Suspension is the only discriminating condition: the same turn, a suspended red Tamer is a valid base.
    s.perm("suspendedTamer").isSuspended = true;
    expect(digivolveOpponentTamerIntent(s, "suspendedTamer", "otherAguni")).toEqual({ ok: true });
    await settle(() => s.perm("suspendedTamer").topCard?.cardId === "BT4-011");
    expect(s.perm("suspendedTamer").stack.map((card) => card.cardId)).toEqual(["BT1-085"]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger Reapermon's when-effects-digivolve [All Turns] effect, unlike a digivolution by an effect (Q4402)", async () => {
    const reapermonBoard = async (opponentBattleArea: { card: string; as: string }[]) => {
      const board = setupEngine(
        {
          0: { battleArea: [{ card: "BT20-078", as: "reapermon" }], deck: ["BT1-001", "BT1-001"] },
          1: {
            battleArea: opponentBattleArea,
            hand: [
              { card: "BT4-011", as: "aguni" },
              { card: "EX2-070", as: "plugIn" },
            ],
            deck: ["BT1-001", "BT1-001", "BT1-001"],
          },
        },
        { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
      );
      board.state.turnSeat = 1;
      board.state.memory = 3;
      await board.ready();
      return board;
    };
    const reapermonTriggered = (board: EngineSetup) =>
      board.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT20-078");

    const agunimonRule = await reapermonBoard([{ card: "BT1-085", as: "tamer" }]);
    expect(
      agunimonRule.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: agunimonRule.perm("tamer").permanentId,
        instanceId: agunimonRule.inst("aguni").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => agunimonRule.perm("tamer").topCard?.cardId === "BT4-011");
    await drainMicrotasks();

    expect(reapermonTriggered(agunimonRule)).toBe(false);
    expect(agunimonRule.perm("tamer").topCard?.cardId).toBe("BT4-011");
    expect(agunimonRule.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-085"]);

    const effectDigivolve = await reapermonBoard([
      { card: "BT1-086", as: "blueTamer" },
      { card: "BT5-007", as: "fieldAgumon" },
    ]);
    expect(
      effectDigivolve.engine.applyIntent(1, {
        type: "playCard",
        instanceId: effectDigivolve.inst("plugIn").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => reapermonTriggered(effectDigivolve) && effectDigivolve.state.pendingDecision === undefined);
    await drainMicrotasks();

    expect(reapermonTriggered(effectDigivolve)).toBe(true);
    expect(effectDigivolve.perm("fieldAgumon").topCard?.cardId).toBe("BT5-007");
    expect(effectDigivolve.state.players[1]!.trash.map((card) => card.instanceId)).toContain(
      effectDigivolve.inst("aguni").instanceId,
    );
  });

  it("cannot back out once digivolution onto a red Tamer is declared, and cannot declare it without a valid base (Q4633)", async () => {
    const noValidBase = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-086", as: "blueTamer" },
          { card: "BT1-030", as: "blueDigimon" },
        ],
        hand: [{ card: "BT4-011", as: "aguni" }],
        deck: ["BT1-001"],
      },
    });
    noValidBase.state.memory = 3;
    await noValidBase.ready();
    for (const alias of ["blueTamer", "blueDigimon"]) {
      expect(digivolveOntoTamer(noValidBase, alias)).toMatchObject({ ok: false });
    }
    expect(noValidBase.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT4-011"]);

    const declared = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "tamer" }],
        hand: [{ card: "BT4-011", as: "aguni" }],
        deck: ["BT1-001"],
      },
    });
    declared.state.memory = 3;
    await declared.ready();

    expect(digivolveOntoTamer(declared, "tamer")).toEqual({ ok: true });
    await settle(() => declared.perm("tamer").topCard?.cardId === "BT4-011");

    expect(declared.decisions.filter(({ req }) => req.sourceCardId === "BT4-011")).toEqual([]);
    expect(declared.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-085"]);
    expect(declared.state.memory).toBe(1);
  });
});
