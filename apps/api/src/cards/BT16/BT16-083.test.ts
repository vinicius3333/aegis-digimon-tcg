import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-083.js";
import "../index.js";

describe("BT16-083", () => {
  it("returns all Tamers, optionally plays one from hand, and plays Ukkomon from trash on deletion", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        { kind: "Return", to: "hand", target: { count: "all" } },
        { kind: "PlayWithoutCost", payCost: false, optional: true, abortOnDecline: true },
        { kind: "PlayWithoutCost", from: ["trash"], payCost: false, target: { filter: { controller: "mine" } } },
      ],
    });
  });

  it("deletes the lowest-level opponent Digimon and may hatch at end of turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          cost: { kind: "return", target: { count: 1 } },
          target: { filter: { superlative: "lowestLevel" } },
          abortOnDecline: true,
        },
        { kind: "PlayWithoutCost", from: ["hand"], payCost: false, breeding: true, optional: true },
      ],
    });
    expect(compiled.effects?.[1]?.actions?.[0]).not.toHaveProperty("optional");
  });

  it("returns a Digi-Egg cost before deleting and hatching through public turn progression", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-083", as: "bigUkko" }],
          hand: ["BT1-009"],
          deck: ["BT1-001"],
          trash: [{ card: "BT1-001", as: "egg" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("egg").instanceId)).toBe(false);
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT1-009");
  });
});

describe("BT16-083 Big Ukkomon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];

  const holds = (s: EngineSetup, seat: 0 | 1, zone: "hand" | "trash", alias: string): boolean =>
    s.state.players[seat]![zone].some((card) => card.instanceId === s.inst(alias).instanceId);

  const onBoard = (s: EngineSetup, seat: 0 | 1, cardId: string): boolean =>
    s.state.players[seat]!.battleArea.some((permanent) => permanent.topCard?.cardId === cardId);

  it("returns the Tamers of both players to their owners' hands on deletion (Q2672)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX13-015", as: "gallantmon" }],
          battleArea: [{ card: "BT1-085", as: "myTamer" }],
          deck: [...FILLER],
        },
        1: {
          battleArea: [
            { card: "BT16-083", as: "bigUkko" },
            { card: "BT1-086", as: "theirTamer" },
          ],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => holds(s, 1, "trash", "bigUkko") && holds(s, 0, "hand", "myTamer"));

    expect(onBoard(s, 1, "BT16-083")).toBe(false);
    expect(holds(s, 0, "hand", "myTamer")).toBe(true);
    expect(holds(s, 1, "hand", "theirTamer")).toBe(true);
    expect(onBoard(s, 0, "BT1-085")).toBe(false);
    expect(onBoard(s, 1, "BT1-086")).toBe(false);
    expect(onBoard(s, 0, "EX13-015")).toBe(true);
  });

  it("still plays to the breeding area after a would-leave effect removed Big Ukkomon mid-resolution (Q2673)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-083", as: "bigUkko", dp: 9000 }],
          hand: [{ card: "BT1-009", as: "hatchling" }],
          deck: [...FILLER],
          trash: [{ card: "BT1-001", as: "egg" }],
        },
        1: { battleArea: [{ card: "EX13-015", as: "gallantmon" }], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("egg").instanceId)).toBe(false);
    expect(onBoard(s, 1, "EX13-015")).toBe(true);
    expect(onBoard(s, 0, "BT16-083")).toBe(false);
    expect(holds(s, 0, "trash", "bigUkko")).toBe(true);
    expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(s.inst("hatchling").instanceId);
  });

  it("allows DigiXros for the Digimon it plays to the breeding area (Q2674)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-083", as: "bigUkko" }],
          hand: [
            { card: "BT10-063", as: "hiVision" },
            { card: "BT7-057", as: "monitamonA" },
            { card: "BT7-057", as: "monitamonB" },
            { card: "BT7-057", as: "monitamonC" },
          ],
          deck: [...FILLER],
          trash: ["BT1-001"],
        },
        1: { battleArea: ["BT1-009"], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("hiVision").instanceId);
    await s.ready();
    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);

    const breeding = s.state.players[0]!.breeding;
    expect(breeding?.topCard.instanceId).toBe(s.inst("hiVision").instanceId);
    const materials = ["monitamonA", "monitamonB", "monitamonC"].map((alias) => s.inst(alias).instanceId);
    expect(breeding?.stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(materials));
    expect(s.state.players[0]!.hand.some((card) => materials.includes(card.instanceId))).toBe(false);
  });

  it("does not trigger [On Play] or 'when a Digimon is played' for its breeding-area play (Q6005)", async () => {
    const board = {
      0: {
        battleArea: [{ card: "BT16-083", as: "bigUkko" }, { card: "BT16-007" }],
        hand: [{ card: "BT6-035", as: "baluchimon" }],
        deck: [...FILLER],
        trash: ["BT1-001"],
      },
      1: { battleArea: ["BT1-009"], deck: [...FILLER] },
    };

    const played = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true });
    played.state.memory = 5;
    await played.ready();
    expect(
      played.engine.applyIntent(0, { type: "playCard", instanceId: played.inst("baluchimon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => played.state.players[0]!.hand.length === 2 && played.state.memory === 2);
    expect(played.state.players[0]!.hand).toHaveLength(2);
    expect(played.state.memory).toBe(2);

    const bred = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true });
    bred.state.memory = 3;
    await bred.ready();
    bred.state.turnSeat = 0;
    const turn = bred.engine.runOneTurn();
    await advance(bred.engine).waitForMainPhase(0);
    const deckAtMain = bred.state.players[0]!.deck.length;
    const memoryAtMain = bred.state.memory;
    advance(bred.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(bred.state.players[0]!.breeding?.topCard.instanceId).toBe(bred.inst("baluchimon").instanceId);
    expect(bred.state.players[0]!.deck).toHaveLength(deckAtMain);
    const memoryHandedToOpponent = -bred.state.memory;
    expect(memoryHandedToOpponent).toBe(memoryAtMain);
  });
});
