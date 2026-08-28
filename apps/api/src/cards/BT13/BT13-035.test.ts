import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-035.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-035 PawnChessmon", () => {
  it("plays Chessmon conditionally and raises the level ceiling by two at eight trash cards", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        expect.objectContaining({
          kind: "ConditionalBranch",
          condition: expect.objectContaining({ kind: "youHave", count: 8 }),
          ifTrue: [
            expect.objectContaining({
              kind: "PlayWithoutCost",
              optional: true,
              target: expect.objectContaining({ filter: expect.objectContaining({ levelComparison: { op: "lte", value: 5 } }) }),
            }),
          ],
          ifFalse: [
            expect.objectContaining({
              kind: "PlayWithoutCost",
              optional: true,
              target: expect.objectContaining({ filter: expect.objectContaining({ levelComparison: { op: "lte", value: 3 } }) }),
            }),
          ],
        }),
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [expect.objectContaining({ keyword: "Reboot" })],
    });
  });

  it("plays a PawnChessmon from hand when deleted during its controller's turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-035", as: "pawn" }], hand: ["BT13-035"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("pawn").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-035"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-035")).toBe(true);
  });

  it("counts the deleted source as the eighth trashed Chessmon and raises the playable ceiling to level 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-035", as: "pawn" }],
          hand: [{ card: "BT13-042", as: "bishop" }],
          trash: Array.from({ length: 7 }, () => "BT13-064"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("pawn").permanentId]);
    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId.includes("BT13-0")).length).toBe(8);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-042"));

    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT13-042")).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("keeps the level ceiling at 3 below eight trashed Chessmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-035", as: "pawn" }],
          hand: [{ card: "BT13-042", as: "bishop" }],
          trash: Array.from({ length: 6 }, () => "BT13-064"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("pawn").permanentId]);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT13-042"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("does not offer the deletion play during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-035", as: "pawn" }], hand: ["BT13-035"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).verb.deletePermanent([s.perm("pawn").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("inherited Reboot unsuspends its host during the opponent's active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-035"], suspended: true }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 1;

    await advance(s.engine).runTurn(1);

    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("digivolves from either yellow or black level 2 for exactly 1 memory", async () => {
    for (const baseCardId of ["BT1-006", "BT10-005"]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "BT13-035", as: "pawn" }],
        },
      });
      s.state.memory = 3;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("pawn").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT13-035");
      expect(s.state.memory).toBe(2);
    }
  });
});
