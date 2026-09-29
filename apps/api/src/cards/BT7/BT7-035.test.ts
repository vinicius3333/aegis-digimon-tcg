import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT7-035.js";
import "../BT1/BT1-087.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-084.js";
import "../BT18/BT18-094.js";

describe("BT7-035 Kazemon", () => {
  it("digivolves from hand onto a yellow Tamer for 2 memory and draws the bonus", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-087", as: "tamer" }],
        hand: [{ card: "BT7-035", as: "kazemon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("kazemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-035" && s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT7-035");
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});

describe("BT7-035 Kazemon — KB Q&A rulings", () => {
  it("treats the Tamer as a Digimon that digivolves: digivolve triggers fire and a can't-digivolve lock blocks it (Q1552)", async () => {
    const triggered = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-087", as: "tamer" },
            { card: "BT16-084", as: "yoleiAndKari" },
          ],
          hand: [{ card: "BT7-035", as: "kazemon" }],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    triggered.state.memory = 3;
    await triggered.ready();

    expect(digivolveOntoTamer(triggered, "tamer")).toEqual({ ok: true });
    await settle(() => triggered.perm("yoleiAndKari").isSuspended && triggered.state.memory === 2);

    expect(triggered.perm("tamer").topCard?.cardId).toBe("BT7-035");
    expect(triggered.perm("yoleiAndKari").isSuspended).toBe(true);
    expect(triggered.state.memory).toBe(2);

    const locked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [{ card: "BT1-087", as: "tamer" }],
        hand: [{ card: "BT7-035", as: "kazemon" }],
        deck: ["BT1-001"],
      },
    });
    locked.state.memory = 3;
    await locked.ready();

    expect(digivolveOntoTamer(locked, "tamer")).toMatchObject({ ok: false });
    expect(locked.perm("tamer").topCard?.cardId).toBe("BT1-087");
    expect(locked.state.memory).toBe(3);
  });

  it("performs the digivolution bonus draw when digivolving onto a Tamer (Q1553)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-087", as: "tamer" }],
        hand: [{ card: "BT7-035", as: "kazemon" }],
        deck: [{ card: "BT1-001", as: "drawn" }, "BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("tamer").topCard?.cardId).toBe("BT7-035");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a Tamer played that same turn (Q1554)", async () => {
    const digivolvedBoard = async (enteredThisTurn: boolean) => {
      const board = setupEngine({
        0: {
          battleArea: [{ card: "BT1-087", as: "tamer", enteredThisTurn }],
          hand: [{ card: "BT7-035", as: "kazemon" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: { security: ["BT1-001", "BT1-001"], deck: ["BT1-001", "BT1-001"] },
      });
      board.state.memory = 3;
      await board.ready();
      expect(digivolveOntoTamer(board, "tamer")).toEqual({ ok: true });
      await settle(() => board.perm("tamer").topCard?.cardId === "BT7-035");
      return board;
    };

    const freshTamer = await digivolvedBoard(true);
    expect(attackPlayer(freshTamer, "tamer")).toMatchObject({ ok: false });
    expect(freshTamer.perm("tamer").isSuspended).toBe(false);
    expect(freshTamer.state.players[1]!.security).toHaveLength(2);

    const establishedTamer = await digivolvedBoard(false);
    expect(attackPlayer(establishedTamer, "tamer")).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card and trashes it when the Digimon leaves the field (Q1555)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-087", as: "tamer" }],
        hand: [{ card: "BT7-035", as: "kazemon" }],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-035");
    const tamerCardId = s.perm("tamer").stack[0]!.instanceId;
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-087"]);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId])).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [tamerCardId, s.inst("kazemon").instanceId].sort(),
    );
  });

  it("does not grant the Tamer's [Security] effect to the Digimon it sits under (Q1556)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "tamer" }],
          hand: [{ card: "BT7-035", as: "kazemon" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: {
          security: [{ card: "BT1-087", as: "opponentTamer" }, "BT1-001"],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-035");
    const buriedTamerId = s.perm("tamer").stack[0]!.instanceId;

    // Opening a [Security] window on the whole stack collects the buried Tamer's effects too,
    // so only the ruling keeps its "play this card" effect from firing.
    await advance(s.engine).fireForPermanent(EffectTiming.SecuritySkill, s.perm("tamer"));
    await drainMicrotasks();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([buriedTamerId]);

    expect(attackPlayer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-087"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-087"]);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT7-035");
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([buriedTamerId]);
  });

  it("gains the inherited effect printed on a Tamer in its digivolution cards (Q1557)", async () => {
    const attackWithKazemonOnto = async (tamerCardId: string) => {
      const board = setupEngine(
        {
          0: {
            battleArea: [{ card: tamerCardId, as: "tamer" }],
            hand: [{ card: "BT7-035", as: "kazemon" }],
            trash: [{ card: "BT7-035", as: "hybridInTrash" }],
            deck: ["BT1-001", "BT1-001", "BT1-001"],
          },
          1: { security: ["BT1-001", "BT1-001"], deck: ["BT1-001", "BT1-001"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      board.state.memory = 3;
      await board.ready();

      expect(digivolveOntoTamer(board, "tamer")).toEqual({ ok: true });
      await settle(() => board.perm("tamer").topCard?.cardId === "BT7-035");
      expect(attackPlayer(board, "tamer")).toEqual({ ok: true });
      await settle(() => board.state.players[1]!.security.length === 1, 5000);
      await drainMicrotasks();
      const hybridId = board.inst("hybridInTrash").instanceId;
      return board.state.players[0]!.hand.some((card) => card.instanceId === hybridId);
    };

    expect(await attackWithKazemonOnto("BT18-094")).toBe(true);
    expect(await attackWithKazemonOnto("BT1-087")).toBe(false);
  });

  it("cannot declare the digivolution without a yellow Tamer to digivolve, and cannot back out once declared (Q4643)", async () => {
    const onlyRedTamer = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "tamer" }],
        hand: [{ card: "BT7-035", as: "kazemon" }],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    onlyRedTamer.state.memory = 3;
    await onlyRedTamer.ready();

    expect(digivolveOntoTamer(onlyRedTamer, "tamer")).toMatchObject({ ok: false });
    expect(onlyRedTamer.perm("tamer").topCard?.cardId).toBe("BT1-085");
    expect(onlyRedTamer.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT7-035"]);
    expect(onlyRedTamer.state.memory).toBe(3);

    const yellowTamer = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "tamer" }],
          hand: [{ card: "BT7-035", as: "kazemon" }],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    yellowTamer.state.memory = 3;
    await yellowTamer.ready();

    expect(digivolveOntoTamer(yellowTamer, "tamer")).toEqual({ ok: true });
    await settle(() => yellowTamer.perm("tamer").topCard?.cardId === "BT7-035" && yellowTamer.state.memory === 1);

    expect(yellowTamer.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-087"]);
    expect(yellowTamer.decisions.filter(({ req }) => req.kind === "optional")).toEqual([]);
  });
});

function digivolveOntoTamer(s: EngineSetup, tamerAlias: string) {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(tamerAlias).permanentId,
    instanceId: s.inst("kazemon").instanceId,
  });
}

function attackPlayer(s: EngineSetup, attackerAlias: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm(attackerAlias).permanentId,
    target: { kind: "player" },
  });
}
