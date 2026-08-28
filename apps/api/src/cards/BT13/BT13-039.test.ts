import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-039.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-039 KnightChessmon", () => {
  it("keeps the Chessmon evolution requirement and conditional deletion play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(
      expect.objectContaining({ level: 3, names: ["Chessmon"], cost: 2 }),
    );
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: { kind: "isYourTurn" },
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ match: "name", tokens: ["Chessmon"] }],
            },
            count: 1,
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [expect.objectContaining({ keyword: "Reboot" })],
    });
  });

  it("plays another level-4 Chessmon from hand after deletion on its turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-039", as: "knight" }], hand: ["BT13-039"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("knight").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-039"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-039")).toBe(true);
  });

  it("cannot play a level-5 Chessmon after deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-039", as: "knight" }], hand: ["BT13-042"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("knight").permanentId]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT13-042"]);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("does not offer the deletion play during the opponent's turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-039", as: "knight" }], hand: ["BT13-039"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).verb.deletePermanent([s.perm("knight").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("inherited Reboot unsuspends its host during the opponent's active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-039"], suspended: true }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("alternately digivolves from yellow or black level-3 Chessmon for 2 memory", async () => {
    for (const baseCardId of ["BT13-035", "BT13-064"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "BT13-039", as: "knight" }] },
      });
      s.state.memory = 4;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("knight").instanceId,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT13-039");
      expect(s.state.memory).toBe(2);
    }
  });

  it("normally digivolves from non-Chessmon yellow or black level 3 for 3 memory", async () => {
    for (const baseCardId of ["BT13-036", "BT10-058"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "BT13-039", as: "knight" }] },
      });
      s.state.memory = 4;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("knight").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT13-039");
      expect(s.state.memory).toBe(1);
    }
  });

  it("rejects the alternate evolution from a non-Chessmon level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-036", as: "base" }], hand: [{ card: "BT13-039", as: "knight" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("knight").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
  });
});
