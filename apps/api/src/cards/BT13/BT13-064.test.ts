import "../ST1/ST1-10.js";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-064.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("BT13-064 PawnChessmon", () => {
  it("keeps Blocker, opponent-turn restriction, and the eight-card level ceiling", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Blocker" })],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "CostModifier",
          mode: "raiseCeiling",
          costType: "level",
          amount: 2,
          condition: {
            kind: "youHave",
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ match: "name", tokens: ["Chessmon"] }],
            },
            count: 8,
          },
        },
        expect.objectContaining({
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 3 },
              nameOrTrait: [{ match: "name", tokens: ["Chessmon"] }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: expect.objectContaining({ kind: "isOpponentsTurn" }),
          optional: true,
        }),
      ],
    });
  });

  it("exposes Blocker as a static keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-064", as: "pawn" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("pawn"), "Blocker")).toBe(true);
  });

  it("plays a level-3 Chessmon from hand when deleted during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-064", as: "pawn", suspended: true }], hand: ["BT13-035"] },
        1: { battleArea: [{ card: "ST1-10", as: "phoenix" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("phoenix").permanentId,
        target: { kind: "permanent", permanentId: s.perm("pawn").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT13-064"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-035"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-035")).toBe(true);
  });

  it("counts the deleted PawnChessmon as the eighth Chessmon and raises the ceiling to level 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-064", as: "pawn", suspended: true }],
          hand: [{ card: "BT13-042", as: "bishop" }],
          trash: Array.from({ length: 7 }, () => "BT13-035"),
        },
        1: { battleArea: [{ card: "ST1-10", as: "phoenix" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("phoenix").permanentId,
        target: { kind: "permanent", permanentId: s.perm("pawn").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT13-064"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-042"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-042")).toBe(true);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT13-042")).toBe(false);
  });

  it("keeps the playable ceiling at level 3 below eight trashed Chessmon cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-064", as: "pawn", suspended: true }],
          hand: [{ card: "BT13-042", as: "bishop" }],
          trash: Array.from({ length: 6 }, () => "BT13-035"),
        },
        1: { battleArea: [{ card: "ST1-10", as: "phoenix" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("phoenix").permanentId,
        target: { kind: "permanent", permanentId: s.perm("pawn").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT13-064"));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT13-042")).toBe(true);
  });
});
