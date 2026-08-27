import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-073.js";
import "./BT13-070.js";

describe("BT13-073 QueenChessmon", () => {
  it("keeps Blocker, Chessmon evolution cost 3, and deletion-triggered unsuspend", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(
      expect.objectContaining({ level: 5, names: ["Chessmon"], cost: 3 }),
    );
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "name", tokens: ["Chessmon"] }],
          },
          actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
        },
      ],
    });
  });

  it("unsuspends itself when your Chessmon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-073", as: "queen" },
          { card: "BT13-070", as: "pawn" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("queen").permanentId]);
    await advance(s.engine).verb.deletePermanent([s.perm("pawn").permanentId]);

    expect(s.perm("queen").isSuspended).toBe(false);
  });
});
