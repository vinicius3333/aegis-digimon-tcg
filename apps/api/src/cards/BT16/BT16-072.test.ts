import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-072.js";
import "../index.js";

describe("BT16-072", () => {
  it("models Blocker and trashes two purple cards among five revealed", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          rest: "deckBottom",
          add: [{ count: 2, to: "trash", filter: { colors: ["Purple"] } }],
        },
      ],
    });
  });

  it("plays a distinct Myotismon-text Tamer from trash on deletion", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        { kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, notSameNameAs: ["battleArea"] },
      ],
    });
  });

  it("trashes two purple cards from the top five and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-072", as: "arukenimon" }],
          deck: ["BT16-069", "BT16-072", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arukenimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.filter((card) => card.cardId === "BT16-069" || card.cardId === "BT16-072").length ===
        2,
    );

    expect(
      s.state.players[0]!.trash.filter((card) => card.cardId === "BT16-069" || card.cardId === "BT16-072"),
    ).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(observe(s.engine).hasKeyword(s.perm("arukenimon"), "Blocker")).toBe(true);
  });

  it("allows only one same-name Myotismon-text Tamer across simultaneous deletions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-072", as: "first" },
            { card: "BT16-072", as: "second" },
          ],
          trash: ["BT8-093", "BT8-093"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent(
      [s.perm("first").permanentId, s.perm("second").permanentId],
      "byEffect",
    );
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT8-093").length === 1,
    );

    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT8-093")).toHaveLength(
      1,
    );
  });
});

async function deleteTwoCopiesWithTamersInTrash(trashTamers: string[]) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT16-072", as: "first" },
          { card: "BT16-072", as: "second" },
        ],
        trash: trashTamers,
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();

  await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId, s.perm("second").permanentId], "byEffect");
  await settle(() => s.state.pendingDecision === undefined);
  return s;
}

function tamerIdsOnField(s: Awaited<ReturnType<typeof deleteTwoCopiesWithTamersInTrash>>): string[] {
  return s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.cardId).sort();
}

describe("BT16-072 Arukenimon — KB Q&A rulings", () => {
  it("cannot use the second simultaneous [On Deletion] to play a Tamer with the same name as the one the first played (Q2659)", async () => {
    const sameName = await deleteTwoCopiesWithTamersInTrash(["BT8-093", "BT8-093"]);

    expect(tamerIdsOnField(sameName)).toEqual(["BT8-093"]);
    expect(sameName.state.players[0]!.trash.filter((card) => card.cardId === "BT8-093")).toHaveLength(1);

    const differentNames = await deleteTwoCopiesWithTamersInTrash(["BT8-093", "BT16-089"]);

    expect(tamerIdsOnField(differentNames)).toEqual(["BT16-089", "BT8-093"]);
  });
});
