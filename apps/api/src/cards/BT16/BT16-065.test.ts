import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-065.js";
import "../index.js";

describe("BT16-065", () => {
  it("stacks both six-memory play-cost reductions", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "BeforePayCost",
      actions: [
        { kind: "ReducePlayCost", payment: { kind: "automatic" }, amount: { kind: "fixed", value: 6 } },
        {
          kind: "ReducePlayCost",
          payment: { kind: "returnFromTrashToDeckTop", target: { count: 6 } },
          amount: { kind: "fixed", value: 6 },
        },
      ],
    });
  });

  it("shares the exact reveal/delete contract and offers Chaosmon DNA digivolution", () => {
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "RevealChooseDeleteBudget",
      revealCount: 3,
      revealController: "mine",
      deleteCount: 1,
      returnRevealed: "trash",
    });
    expect(compiled.effects[2]?.actions[0]).toEqual(compiled.effects[1]?.actions[0]);
    expect(compiled.effects[3]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [{ kind: "DnaDigivolve", payCost: true, optional: true }],
    });
  });

  it("applies both reductions and returns exactly 6 D-Brigade cards to the deck top", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-065", as: "darkdramon" }],
          trash: Array.from({ length: 6 }, () => "BT16-050"),
        },
        1: { battleArea: [{ card: "BT16-036", as: "boss" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]?.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-065") === true,
    );

    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]?.trash).toHaveLength(3);
    expect(s.state.players[0]?.deck).toHaveLength(3);
    expect(s.state.players[0]?.trash.every((card) => card.cardId === "BT16-050")).toBe(true);
    expect(s.state.players[0]?.deck.every((card) => card.cardId === "BT16-050")).toBe(true);
  });

  it("reveals three, deletes within the chosen play-cost budget, and trashes the reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-065", as: "darkdramon" }],
          deck: ["BT16-050", "BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(
      s.state.players[0]!.trash.filter((card) => card.cardId === "BT16-050" || card.cardId === "BT1-009"),
    ).toHaveLength(3);
  });
});

describe("BT16-065 Darkdramon — KB Q&A rulings", () => {
  it("reduces the play cost by 6 when only the opponent has a [Boss] Digimon (Q2654)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-065", as: "darkdramon" }] },
        1: { battleArea: [{ card: "BT16-036", as: "opponentBoss" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]?.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-065") === true,
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT16-065"]);
    expect(s.state.memory).toBe(3);
  });

  it("reduces the play cost by 12 with a [Boss] Digimon and 6 returned [D-Brigade] cards (Q2655)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-065", as: "darkdramon" }],
          battleArea: [{ card: "BT16-036", as: "ownBoss" }],
          trash: Array.from({ length: 6 }, () => "BT16-050"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]?.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-065") === true,
    );

    expect(s.state.memory).toBe(9);
    // [On Play] then reveals the top 3 returned cards and trashes them.
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT16-050", "BT16-050", "BT16-050"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT16-050", "BT16-050", "BT16-050"]);
  });
});
