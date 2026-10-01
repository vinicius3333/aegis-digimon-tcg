import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import type { BoardSpec, EngineSetup } from "../../engine/testkit/harness.js";
import "../BT1/BT1-085.js";
import "./BT3-090.js";
describe("BT3-090 Mastemon", () => {
  it("trashes both top security cards and plays a low-level card from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "base" }],
          hand: [{ card: "BT3-090", as: "evolving" }],
          security: ["BT1-010"],
          trash: [{ card: "BT2-072", as: "played" }],
        },
        1: { security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p = s.state.players[0] as PlayerState;
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT3-090"));
    expect(p.security).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(p.battleArea.some((x) => x.topCard.cardId === "BT2-072")).toBe(true);
  });
});

describe("BT3-090 Mastemon — KB Q&A rulings", () => {
  async function digivolveIntoMastemon(board: BoardSpec) {
    const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mastemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT3-090"));
    await settle();
    return s;
  }

  const trashCardIds = (s: EngineSetup, seat: 0 | 1) => s.state.players[seat]!.trash.map((card) => card.cardId);
  const battleAreaCardIds = (s: EngineSetup, seat: 0 | 1) =>
    s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId);

  it("still trashes the top security card of both players without a playable card in trash (Q1112)", async () => {
    const s = await digivolveIntoMastemon({
      0: {
        battleArea: [{ card: "BT10-012", as: "base" }],
        hand: [{ card: "BT3-090", as: "mastemon" }],
        security: ["BT1-009", "BT1-013"],
        trash: [{ card: "BT1-014", as: "redLevelFour" }],
      },
      1: { security: ["BT1-011", "BT1-013"] },
    });

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(trashCardIds(s, 0)).toContain("BT1-009");
    expect(trashCardIds(s, 1)).toContain("BT1-011");
    expect(trashCardIds(s, 0)).toContain("BT1-014");
    expect(battleAreaCardIds(s, 0)).not.toContain("BT1-014");
  });

  it("does not activate [Security] effects of the security cards it trashes (Q1113)", async () => {
    const s = await digivolveIntoMastemon({
      0: {
        battleArea: [{ card: "BT10-012", as: "base" }],
        hand: [{ card: "BT3-090", as: "mastemon" }],
        security: [{ card: "BT1-085", as: "myTai" }, "BT1-009"],
      },
      1: { security: [{ card: "BT1-085", as: "opponentTai" }, "BT1-009"] },
    });

    expect(trashCardIds(s, 0)).toContain("BT1-085");
    expect(trashCardIds(s, 1)).toContain("BT1-085");
    expect(battleAreaCardIds(s, 0)).not.toContain("BT1-085");
    expect(battleAreaCardIds(s, 1)).not.toContain("BT1-085");
    expect(s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT1-085")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not win the game when the opponent's security stack is already empty (Q1114)", async () => {
    const s = await digivolveIntoMastemon({
      0: {
        battleArea: [{ card: "BT10-012", as: "base" }],
        hand: [{ card: "BT3-090", as: "mastemon" }],
        security: ["BT1-009", "BT1-013"],
      },
      1: { security: [] },
    });

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.events.some((e) => e.kind === "gameOver")).toBe(false);
    expect(s.state.gameOver).toBe(false);
  });

  it("still plays a level 4 or lower purple Digimon from trash when both security stacks are empty (Q1115)", async () => {
    const s = await digivolveIntoMastemon({
      0: {
        battleArea: [{ card: "BT10-012", as: "base" }],
        hand: [{ card: "BT3-090", as: "mastemon" }],
        security: [],
        trash: [{ card: "BT2-072", as: "vilemon" }],
      },
      1: { security: [] },
    });

    expect(s.perm("vilemon").topCard?.cardId).toBe("BT2-072");
    expect(trashCardIds(s, 0)).not.toContain("BT2-072");
    expect(s.state.memory).toBe(0);
    expect(s.events.some((e) => e.kind === "gameOver")).toBe(false);
  });

  it("offers only 1 purple or yellow level 4 or lower Digimon card from trash (Q1116)", async () => {
    const s = await digivolveIntoMastemon({
      0: {
        battleArea: [{ card: "BT10-012", as: "base" }],
        hand: [{ card: "BT3-090", as: "mastemon" }],
        security: ["BT1-009"],
        trash: [
          { card: "BT2-075", as: "purpleLevelFive" },
          { card: "BT1-014", as: "redLevelFour" },
          { card: "BT1-051", as: "yellowLevelFour" },
          { card: "BT2-072", as: "purpleLevelFour" },
        ],
      },
      1: { security: ["BT1-009"] },
    });

    const playSelection = s.decisions.find(
      ({ seat, req }) =>
        seat === 0 &&
        req.kind === "selectCards" &&
        (req.options?.candidateInstanceIds ?? []).includes(s.inst("purpleLevelFour").instanceId),
    );
    expect(playSelection).toBeDefined();
    expect([...(playSelection!.req.options?.candidateInstanceIds ?? [])].sort()).toEqual(
      [s.inst("yellowLevelFour").instanceId, s.inst("purpleLevelFour").instanceId].sort(),
    );
    expect(playSelection!.req.options?.max).toBe(1);

    const playedFromTrash = battleAreaCardIds(s, 0).filter((cardId) => cardId === "BT1-051" || cardId === "BT2-072");
    expect(playedFromTrash).toHaveLength(1);
    expect(battleAreaCardIds(s, 0)).not.toContain("BT2-075");
    expect(battleAreaCardIds(s, 0)).not.toContain("BT1-014");
  });
});
