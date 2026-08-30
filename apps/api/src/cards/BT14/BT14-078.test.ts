import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-078.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-078", () => {
  it("deletes itself, draws two, and may return a Loogamon at end of your turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [
        { kind: "Delete" },
        { kind: "Draw", amount: 2 },
        {
          kind: "Return",
          to: "hand",
          optional: true,
          target: { filter: { nameOrTrait: [{ tokens: ["Loogamon"], match: "name" }] } },
        },
      ],
    }));
  it("scales the deletion level ceiling with the number of cards trashed", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      actions: [
        { kind: "Trash", optional: true, trackCount: "trashedThisEffect", target: { count: 3 } },
        {
          kind: "Delete",
          scaling: { unit: "namedCount", countSource: "trashedThisEffect", levelCeilingAdd: 1 },
          target: { filter: { levelComparison: { op: "lte", value: 3 } } },
        },
      ],
    }));
  it("trashes a qualifying hand card and deletes an opponent up to the scaled level", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-078", as: "source" }], hand: [{ card: "BT14-071", as: "darkAnimal" }] },
        1: { battleArea: [{ card: "BT14-074", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "BT14-071") &&
        s.state.players[1]!.battleArea.length === 0,
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-071")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
  it("deletes, draws, and returns Loogamon through the natural end-of-turn path", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-078", as: "source" }],
          hand: ["BT14-072", "BT14-074", "BT14-079"],
          trash: [{ card: "BT14-071", as: "loogamon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.isFirstPlayersFirstTurn = true;
    await advance(s.engine).runTurn(0);
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-078") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "BT14-071") &&
        s.state.players[0]!.deck.length === 0,
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-078")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-071")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
