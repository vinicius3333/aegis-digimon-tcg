import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-042.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-042 BishopChessmon", () => {
  it("keeps the level-4 Chessmon evolution and level-5 deletion play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(
      expect.objectContaining({ level: 4, names: ["Chessmon"], cost: 3 }),
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
              levelComparison: { op: "lte", value: 5 },
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

  it("plays another BishopChessmon from hand after deletion on its turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-042", as: "bishop" }], hand: ["BT13-042"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("bishop").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-042"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-042")).toBe(true);
  });

  it("does not offer a level-6 Chessmon or any play on the opponent's turn", async () => {
    for (const opponentTurn of [false, true]) {
      const s = setupEngine(
        { 0: { battleArea: [{ card: "BT13-042", as: "bishop" }], hand: [opponentTurn ? "BT13-042" : "BT13-045"] } },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      if (opponentTurn) s.state.turnSeat = 1;
      await advance(s.engine).verb.deletePermanent([s.perm("bishop").permanentId]);
      expect(s.state.players[0]!.hand).toHaveLength(1);
      expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    }
  });

  it("inherited Reboot unsuspends its host during the opponent's active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-045", as: "host", under: ["BT13-042"], suspended: true }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("uses the alternate route from either color level-4 Chessmon for exactly 3", async () => {
    for (const baseCardId of ["BT13-039", "BT13-068"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "BT13-042", as: "bishop" }] },
      });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("bishop").instanceId,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT13-042");
      expect(s.state.memory).toBe(2);
    }
  });

  it("normally digivolves from non-Chessmon yellow or black level 4 for 4 and rejects their alternate route", async () => {
    for (const baseCardId of ["BT13-038", "BT10-061"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "BT13-042", as: "bishop" }] },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("bishop").instanceId,
          alternateRequirementIndex: 0,
        }),
      ).toMatchObject({ ok: false });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("bishop").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT13-042");
      expect(s.state.memory).toBe(1);
    }
  });
});
