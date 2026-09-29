import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT7-021.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-085.js";
import "../BT18/BT18-089.js";

describe("BT7-021 Kumamon", () => {
  it("digivolves onto a blue Tamer for its printed cost but rejects a Tamer of another color", async () => {
    expect(matchingAlternateDigivolutionRequirement("BT7-021", "BT1-086")).toMatchObject({
      cost: 2,
      baseIsTamer: true,
    });
    expect(matchingAlternateDigivolutionRequirement("BT7-021", "BT1-085")).toBeUndefined();

    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-086", as: "blueTamer" },
          { card: "BT1-085", as: "redTamer" },
        ],
        hand: [{ card: "BT7-021", as: "kumamon" }],
      },
    });
    const kumamon = s.inst("kumamon").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redTamer").permanentId,
        instanceId: kumamon,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueTamer").permanentId,
        instanceId: kumamon,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueTamer").topCard?.instanceId === kumamon);

    expect(s.state.memory).toBe(0);
  });

  it("trashes the bottom source of an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-028", as: "base" }], hand: [{ card: "BT7-021", as: "evolving" }] },
        1: { battleArea: [{ card: "BT1-009", under: ["BT1-001", "BT1-002"], as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    const bottom = s.perm("target").stack[0]!.instanceId;
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.trash.some((card) => card.instanceId === bottom));
    expect(s.perm("target").stack).toHaveLength(1);
  });
});

function digivolveOntoTamer(s: EngineSetup, tamerAlias: string, kumamonAlias = "kumamon") {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(tamerAlias).permanentId,
    instanceId: s.inst(kumamonAlias).instanceId,
  });
}

function attackPlayer(s: EngineSetup, attackerAlias: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm(attackerAlias).permanentId,
    target: { kind: "player" },
  });
}

describe("BT7-021 Kumamon — KB Q&A rulings", () => {
  it("treats the Tamer as a Digimon that digivolves: digivolve triggers fire and a can't-digivolve lock blocks it (Q1523)", async () => {
    const triggered = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-086", as: "tamer" },
            { card: "BT16-085", as: "davisAndKen" },
          ],
          hand: [{ card: "BT7-021", as: "kumamon" }],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    triggered.state.memory = 3;
    await triggered.ready();

    expect(digivolveOntoTamer(triggered, "tamer")).toEqual({ ok: true });
    await settle(() => triggered.perm("davisAndKen").isSuspended && triggered.state.memory === 2);

    expect(triggered.perm("tamer").topCard?.cardId).toBe("BT7-021");
    expect(triggered.perm("davisAndKen").isSuspended).toBe(true);
    expect(triggered.state.memory).toBe(2);

    const locked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT7-021", as: "kumamon" }],
        deck: ["BT1-001"],
      },
    });
    locked.state.memory = 3;
    await locked.ready();

    expect(digivolveOntoTamer(locked, "tamer")).toMatchObject({ ok: false });
    expect(locked.perm("tamer").topCard?.cardId).toBe("BT1-086");
    expect(locked.state.memory).toBe(3);
  });

  it("performs the digivolution bonus draw when digivolving onto a Tamer (Q1524)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT7-021", as: "kumamon" }],
        deck: [{ card: "BT1-001", as: "drawn" }, "BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("tamer").topCard?.cardId).toBe("BT7-021");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a Tamer played that same turn (Q1525)", async () => {
    const digivolvedBoard = async (enteredThisTurn: boolean) => {
      const board = setupEngine({
        0: {
          battleArea: [{ card: "BT1-086", as: "tamer", enteredThisTurn }],
          hand: [{ card: "BT7-021", as: "kumamon" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: { security: ["BT1-001", "BT1-001"], deck: ["BT1-001", "BT1-001"] },
      });
      board.state.memory = 3;
      await board.ready();
      expect(digivolveOntoTamer(board, "tamer")).toEqual({ ok: true });
      await settle(() => board.perm("tamer").topCard?.cardId === "BT7-021");
      return board;
    };

    const freshTamer = await digivolvedBoard(true);
    expect(attackPlayer(freshTamer, "tamer")).toMatchObject({ ok: false });
    expect(freshTamer.perm("tamer").isSuspended).toBe(false);
    expect(freshTamer.state.players[1]!.security).toHaveLength(2);

    const establishedTamer = await digivolvedBoard(false);
    expect(attackPlayer(establishedTamer, "tamer")).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card and trashes it when the Digimon leaves the field (Q1526)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT7-021", as: "kumamon" }],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-021");
    const tamerCardId = s.perm("tamer").stack[0]!.instanceId;
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-086"]);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId])).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [tamerCardId, s.inst("kumamon").instanceId].sort(),
    );
  });

  it("does not grant the Tamer's [Security] effect to the Digimon it sits under (Q1527)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-089", as: "tommy" }],
          hand: [{ card: "BT7-021", as: "kumamon" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: {
          security: [{ card: "BT18-089", as: "opponentTommy" }, "BT1-001"],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(digivolveOntoTamer(s, "tommy")).toEqual({ ok: true });
    await settle(() => s.perm("tommy").topCard?.cardId === "BT7-021");
    const buriedTommyId = s.perm("tommy").stack[0]!.instanceId;

    // Opening a [Security] window on the whole stack collects the buried Tamer's effects too,
    // so only the ruling keeps its "play this card" effect from firing.
    await advance(s.engine).fireForPermanent(EffectTiming.SecuritySkill, s.perm("tommy"));
    await drainMicrotasks();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("tommy").stack.map((card) => card.instanceId)).toEqual([buriedTommyId]);

    expect(attackPlayer(s, "tommy")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-089"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT18-089"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("tommy").topCard?.cardId).toBe("BT7-021");
    expect(s.perm("tommy").stack.map((card) => card.cardId)).toEqual(["BT18-089"]);
  });

  it("gains the inherited effect printed on a Tamer in its digivolution cards (Q1528)", async () => {
    const attackWithKumamonOnto = async (tamerCardId: string) => {
      const board = setupEngine(
        {
          0: {
            battleArea: [{ card: tamerCardId, as: "tamer" }],
            hand: [{ card: "BT7-021", as: "kumamon" }],
            deck: ["BT1-001", "BT1-001", "BT1-001"],
          },
          1: {
            battleArea: [{ card: "BT1-009", under: ["BT1-001", "BT1-002", "BT1-003"], as: "target" }],
            security: ["BT1-001", "BT1-001"],
            deck: ["BT1-001", "BT1-001"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      board.state.memory = 3;
      await board.ready();

      expect(digivolveOntoTamer(board, "tamer")).toEqual({ ok: true });
      await settle(() => board.perm("tamer").topCard?.cardId === "BT7-021" && board.perm("target").stack.length === 2);
      expect(attackPlayer(board, "tamer")).toEqual({ ok: true });
      await settle(() => board.state.players[1]!.security.length === 1, 5000);
      await drainMicrotasks();
      return board.perm("target").stack.map((card) => card.cardId);
    };

    expect(await attackWithKumamonOnto("BT18-089")).toEqual(["BT1-003"]);
    expect(await attackWithKumamonOnto("BT1-086")).toEqual(["BT1-002", "BT1-003"]);
  });

  it("cannot decline once digivolution onto a Tamer is declared, and cannot declare it without a digivolvable card (Q4640)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT7-021", as: "kumamon" }],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(digivolveOntoTamer(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-021");

    expect(s.decisions).toEqual([]);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-086"]);
    expect(s.state.memory).toBe(1);

    const noDigivolvableCard = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "redTamer" }],
        hand: [{ card: "BT7-021", as: "kumamon" }],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    noDigivolvableCard.state.memory = 3;
    await noDigivolvableCard.ready();

    expect(digivolveOntoTamer(noDigivolvableCard, "redTamer")).toMatchObject({ ok: false });
    expect(noDigivolvableCard.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT7-021"]);
    expect(noDigivolvableCard.perm("redTamer").topCard?.cardId).toBe("BT1-085");
    expect(noDigivolvableCard.state.memory).toBe(3);
  });
});
