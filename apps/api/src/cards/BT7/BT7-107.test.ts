import { describe, it, expect } from "vitest";
import { setupEngine, settle, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT7-107.js";
import "../BT2/BT2-070.js";
import "../BT24/BT24-036.js";
import "../BT24/BT24-057.js";
import "../BT24/BT24-067.js";
import "../BT24/BT24-071.js";

const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];

const instanceIds = (cards: Iterable<{ instanceId: string }>): string[] => Array.from(cards, (card) => card.instanceId);

describe("BT7-107 Calling From the Darkness", () => {
  it("deletes one Digimon and returns purple cards from trash", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT7-067"], hand: [{ card: "BT7-107", as: "option" }], trash: ["BT7-068"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((c) => c.cardId === "BT7-068"));
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT7-068")).toBe(true);
  });
});

describe("BT7-107 Calling From the Darkness — KB Q&A rulings", () => {
  async function linkThenCall(board: BoardSpec, linkAlias: string, returnHost: boolean): Promise<EngineSetup> {
    const s = setupEngine(board, {
      autoSelectCards: true,
      autoAcceptOptional: true,
      declinePrompts: returnHost ? [] : ["Calling From the Darkness"],
    });
    s.state.memory = 5;
    await s.ready();
    const callingId = s.inst("calling").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst(linkAlias).instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst(linkAlias).instanceId));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: callingId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === callingId));
    await settle();
    const hostZone = returnHost ? s.state.players[0]!.hand : s.state.players[0]!.trash;
    expect(instanceIds(hostZone)).toContain(s.inst("host").instanceId);
    return s;
  }

  it("can return the purple Digimon it just deleted to the hand (Q1673)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-068", as: "lopmon" }],
          hand: [{ card: "BT7-107", as: "calling" }],
          trash: [{ card: "BT7-044", as: "greenBetamon" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("calling").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("lopmon").instanceId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(instanceIds(s.state.players[0]!.hand)).toEqual([s.inst("lopmon").instanceId]);
    expect(instanceIds(s.state.players[0]!.trash)).toContain(s.inst("greenBetamon").instanceId);
  });

  it("the returned Digimon's [On Deletion] triggers but cannot activate once it left the trash (Q1674)", async () => {
    function playCalling(declineReturn: boolean): { s: EngineSetup; callingId: string } {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT2-070", as: "tapirmon" }],
            hand: [{ card: "BT7-107", as: "calling" }],
            deck: [...FILLER],
          },
        },
        {
          autoSelectCards: true,
          autoAcceptOptional: true,
          declinePrompts: declineReturn ? ["Calling From the Darkness"] : [],
        },
      );
      s.state.memory = 3;
      const callingId = s.inst("calling").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: callingId })).toEqual({ ok: true });
      return { s, callingId };
    }

    const { s: returned, callingId } = playCalling(false);
    await settle(() => returned.state.players[0]!.trash.some((card) => card.instanceId === callingId));
    await settle();
    expect(instanceIds(returned.state.players[0]!.hand)).toEqual([returned.inst("tapirmon").instanceId]);
    expect(returned.state.players[0]!.deck).toHaveLength(FILLER.length);

    const { s: leftInTrash } = playCalling(true);
    await settle(() => leftInTrash.state.players[0]!.deck.length === FILLER.length - 1);
    expect(instanceIds(leftInTrash.state.players[0]!.trash)).toContain(leftInTrash.inst("tapirmon").instanceId);
    expect(leftInTrash.state.players[0]!.hand).toHaveLength(1);
  });

  it("cannot activate a linked Medicmon's [On Deletion] once its deleted host is returned to the hand (Q5615)", async () => {
    const board = (): BoardSpec => ({
      0: {
        battleArea: [{ card: "BT24-067", as: "host" }],
        hand: [
          { card: "BT24-036", as: "medicmon" },
          { card: "BT7-107", as: "calling" },
        ],
      },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 6000 }] },
    });

    const returned = await linkThenCall(board(), "medicmon", true);
    expect(returned.perm("target").currentDP).toBe(6000);

    const leftInTrash = await linkThenCall(board(), "medicmon", false);
    expect(leftInTrash.perm("target").currentDP).toBe(1000);
  });

  it("cannot activate a linked Docmon's [On Deletion] once its deleted host is returned to the hand (Q5643)", async () => {
    const board = (): BoardSpec => ({
      0: {
        battleArea: [{ card: "BT24-067", as: "host" }],
        hand: [
          { card: "BT24-057", as: "docmon" },
          { card: "BT7-107", as: "calling" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-020", as: "target", under: [{ card: "BT1-010", as: "targetSource" }] }],
      },
    });

    const returned = await linkThenCall(board(), "docmon", true);
    expect(returned.perm("target").topCard.instanceId).toBe(returned.inst("target").instanceId);
    expect(instanceIds(returned.perm("target").stack)).toEqual([returned.inst("targetSource").instanceId]);

    const leftInTrash = await linkThenCall(board(), "docmon", false);
    expect(instanceIds(leftInTrash.state.players[1]!.trash)).toEqual([leftInTrash.inst("target").instanceId]);
    expect(leftInTrash.state.players[1]!.battleArea[0]!.topCard.instanceId).toBe(
      leftInTrash.inst("targetSource").instanceId,
    );
  });

  it("cannot activate a linked Raidramon's [On Deletion] once its deleted host is returned to the hand (Q5648)", async () => {
    const board = (): BoardSpec => ({
      0: {
        battleArea: [{ card: "BT24-067", as: "host" }],
        hand: [
          { card: "BT24-071", as: "raidramon" },
          { card: "BT7-107", as: "calling" },
        ],
        trash: [{ card: "BT21-009", as: "gatchmon" }],
      },
    });

    const returned = await linkThenCall(board(), "raidramon", true);
    expect(returned.state.players[0]!.battleArea).toHaveLength(0);
    expect(instanceIds(returned.state.players[0]!.trash)).toContain(returned.inst("gatchmon").instanceId);

    const leftInTrash = await linkThenCall(board(), "raidramon", false);
    expect(leftInTrash.state.players[0]!.battleArea).toHaveLength(1);
  });
});
