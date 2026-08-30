import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-070.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-070 RookChessmon", () => {
  it("keeps Blocker, evolution cost 3, and opponent-turn level-5 play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(
      expect.objectContaining({ level: 4, names: ["Chessmon"], cost: 3 }),
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
              levelComparison: { op: "lte", value: 5 },
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

  it("plays a level-5 Chessmon after deletion during the opponent's turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-070", as: "rook" }], hand: ["BT13-042"] }, 1: { security: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("rook").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-042"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-042")).toBe(true);
  });

  it("alternately digivolves from a level-4 Chessmon for 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-068", as: "knight" }], hand: [{ card: "BT13-070", as: "rook" }] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("knight").permanentId,
        instanceId: s.inst("rook").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("knight").topCard?.cardId === "BT13-070");
    expect(s.state.memory).toBe(2);
  });

  it("rejects the alternate evolution from a non-Chessmon level 4", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-066", as: "dorugamon" }], hand: [{ card: "BT13-070", as: "rook" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dorugamon").permanentId,
        instanceId: s.inst("rook").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
  });
});
