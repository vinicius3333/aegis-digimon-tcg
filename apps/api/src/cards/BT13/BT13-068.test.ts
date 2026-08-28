import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-068.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-068 KnightChessmon", () => {
  it("keeps Blocker, evolution cost 2, and opponent-turn Chessmon play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(
      expect.objectContaining({ level: 3, names: ["Chessmon"], cost: 2 }),
    );
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ match: "name", tokens: ["Chessmon"] }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: { kind: "isOpponentsTurn" },
          optional: true,
        },
      ],
    });
  });

  it("plays a level-4 Chessmon from hand after deletion during the opponent's turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-068", as: "knight" }], hand: ["BT13-039"] }, 1: { security: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("knight").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-039"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-039")).toBe(true);
  });

  it("alternately digivolves from a level-3 Chessmon for 2 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-035", as: "pawn" }], hand: [{ card: "BT13-068", as: "knight" }] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pawn").permanentId,
        instanceId: s.inst("knight").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pawn").topCard?.cardId === "BT13-068");
    expect(s.state.memory).toBe(3);
  });

  it("rejects the alternate evolution from a non-Chessmon level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-036", as: "liollmon" }], hand: [{ card: "BT13-068", as: "knight" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("liollmon").permanentId,
        instanceId: s.inst("knight").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
  });
});
