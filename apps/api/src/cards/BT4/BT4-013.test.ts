import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT4-013.js";
import "../BT12/BT12-088.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-084.js";

describe("BT4-013 BurningGreymon", () => {
  it("digivolves onto a red Tamer for 3 memory and has +3000 DP on its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "tamer" }],
        hand: [{ card: "BT4-013", as: "burning" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("burning").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").currentDP === 9000);
    await s.engine.recomputeContinuousEffects();

    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT4-013");
    expect(s.perm("tamer").currentDP).toBe(9000);
  });

  it("cannot use a non-red Tamer as its alternate digivolution base", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT4-013", as: "burning" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("burning").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("tamer").topCard?.cardId).toBe("BT1-086");
  });

  it("does not get its Your Turn DP bonus during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-013", as: "burning" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("burning").currentDP).toBe(s.perm("burning").baseDP);
  });
});

describe("BT4-013 BurningGreymon — KB Q&A rulings", () => {
  it.fails("treats the Tamer as a Digimon that digivolves: digivolve triggers fire and a can't-digivolve lock blocks it (Q1164)", async () => {
    const triggered = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-085", as: "tamer" },
            { card: "BT16-084", as: "yolei" },
          ],
          hand: [{ card: "BT4-013", as: "burning" }],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    triggered.state.memory = 4;
    await triggered.ready();

    expect(digivolveOntoTamer(triggered, "tamer")).toEqual({ ok: true });
    await settle(() => triggered.perm("yolei").isSuspended && triggered.state.memory === 2);

    expect(triggered.perm("tamer").topCard?.cardId).toBe("BT4-013");
    expect(triggered.perm("yolei").isSuspended).toBe(true);
    expect(triggered.state.memory).toBe(2);

    const locked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [{ card: "BT1-085", as: "tamer" }],
        hand: [{ card: "BT4-013", as: "burning" }],
        deck: ["BT1-001"],
      },
    });
    locked.state.memory = 4;
    await locked.ready();

    expect(digivolveOntoTamer(locked, "tamer")).toMatchObject({ ok: false });
    expect(locked.perm("tamer").topCard?.cardId).toBe("BT1-085");
    expect(locked.state.memory).toBe(4);
  });

  it("performs the digivolution bonus draw when digivolving onto a Tamer (Q1165)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "tamer" }],
        hand: [{ card: "BT4-013", as: "burning" }],
        deck: [{ card: "BT1-001", as: "drawn" }, "BT1-001"],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("tamer").topCard?.cardId).toBe("BT4-013");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a Tamer played that same turn (Q1166)", async () => {
    const digivolveOnto = async (enteredThisTurn: boolean) => {
      const board = setupEngine({
        0: {
          battleArea: [{ card: "BT1-085", as: "tamer", enteredThisTurn }],
          hand: [{ card: "BT4-013", as: "burning" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: { security: ["BT1-001", "BT1-001"], deck: ["BT1-001", "BT1-001"] },
      });
      board.state.memory = 4;
      await board.ready();
      expect(digivolveOntoTamer(board, "tamer")).toEqual({ ok: true });
      await settle(() => board.perm("tamer").topCard?.cardId === "BT4-013");
      return board;
    };
    const attackPlayer = (board: EngineSetup) =>
      board.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: board.perm("tamer").permanentId,
        target: { kind: "player" },
      });

    const freshTamer = await digivolveOnto(true);
    expect(attackPlayer(freshTamer)).toMatchObject({ ok: false });
    expect(freshTamer.perm("tamer").isSuspended).toBe(false);
    expect(freshTamer.state.players[1]!.security).toHaveLength(2);

    const establishedTamer = await digivolveOnto(false);
    expect(attackPlayer(establishedTamer)).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card and trashes it when the Digimon leaves play (Q1167)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "tamer" }],
          hand: [{ card: "BT4-013", as: "burning" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "AD1-001", as: "wall", dp: 12000, suspended: true }],
          security: ["BT1-001"],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT4-013");
    const burningGreymonId = s.perm("tamer").permanentId;
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-085"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: burningGreymonId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== burningGreymonId),
      5000,
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-085", "BT4-013"]);
  });

  it("does not grant the Tamer's [Security] effect to the Digimon it sits under (Q1168)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-088", as: "takuya" },
            { card: "BT12-088", as: "fieldTakuya" },
          ],
          hand: [{ card: "BT4-013", as: "burning" }],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(digivolveOntoTamer(s, "takuya")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT4-013");
    const buriedTakuyaId = s.perm("takuya").stack[0]!.instanceId;
    const takuyaSecurityTriggers = (fromEvent: number) =>
      s.events
        .slice(fromEvent)
        .filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT12-088");

    // The [Security] window collects every card in the stack, so only the ruling keeps the
    // buried Tamer's "play this card" effect from triggering.
    const buriedWindowStart = s.events.length;
    await advance(s.engine).fireForPermanent(EffectTiming.SecuritySkill, s.perm("takuya"));
    await drainMicrotasks();
    expect(takuyaSecurityTriggers(buriedWindowStart)).toEqual([]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.perm("takuya").topCard?.cardId).toBe("BT4-013");
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual([buriedTakuyaId]);

    // Near-miss control: the same window does trigger the effect when Takuya is the top card.
    const topCardWindowStart = s.events.length;
    await advance(s.engine).fireForPermanent(EffectTiming.SecuritySkill, s.perm("fieldTakuya"));
    await drainMicrotasks();
    expect(takuyaSecurityTriggers(topCardWindowStart)).toHaveLength(1);
  });

  it("gains the inherited effect printed on a Tamer in its digivolution cards (Q1169)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-088", as: "takuya" },
          { card: "BT1-085", as: "tai" },
        ],
        hand: [
          { card: "BT4-013", as: "burning" },
          { card: "BT4-013", as: "otherBurning" },
        ],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(digivolveOntoTamer(s, "takuya")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT4-013");
    expect(digivolveOntoTamer(s, "tai", "otherBurning")).toEqual({ ok: true });
    await settle(() => s.perm("tai").topCard?.cardId === "BT4-013" && s.perm("takuya").currentDP === 11000);

    expect(s.perm("takuya").currentDP).toBe(11000);
    expect(s.perm("tai").currentDP).toBe(9000);
  });

  it("commits to the digivolution once declared onto a Tamer and cannot be declared without a valid base (Q4634)", async () => {
    const noValidBase = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "blueTamer" }],
        hand: [{ card: "BT4-013", as: "burning" }],
        deck: ["BT1-001"],
      },
    });
    noValidBase.state.memory = 4;
    await noValidBase.ready();

    expect(digivolveOntoTamer(noValidBase, "blueTamer")).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(noValidBase.state.pendingDecision).toBeUndefined();
    expect(noValidBase.state.memory).toBe(4);
    expect(noValidBase.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT4-013"]);
    expect(noValidBase.perm("blueTamer").topCard?.cardId).toBe("BT1-086");

    const redTamer = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "tamer" }],
        hand: [{ card: "BT4-013", as: "burning" }],
        deck: ["BT1-001"],
      },
    });
    redTamer.state.memory = 4;
    await redTamer.ready();

    expect(digivolveOntoTamer(redTamer, "tamer")).toEqual({ ok: true });
    expect(redTamer.state.pendingDecision).toBeUndefined();
    await settle(() => redTamer.perm("tamer").topCard?.cardId === "BT4-013");

    expect(redTamer.state.pendingDecision).toBeUndefined();
    expect(redTamer.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-085"]);
    expect(redTamer.state.memory).toBe(1);
    expect(redTamer.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT4-013");
  });
});

function digivolveOntoTamer(s: EngineSetup, tamerAlias: string, burningGreymonAlias = "burning") {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(tamerAlias).permanentId,
    instanceId: s.inst(burningGreymonAlias).instanceId,
  });
}
