import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-105.js";

describe("BT6-105 Gewalt Schwärmer", () => {
  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT6-105", as: "security", faceUp: true }] } });
    const instanceId = s.inst("security").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)).toBe(true);
  });

  it("deletes both players' Digimon with play costs of 7 or less and preserves higher-cost Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "ownLow" },
            { card: "BT6-017", as: "ownHigh" },
          ],
          hand: [{ card: "BT6-105", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "opponentLow" },
            { card: "BT6-086", as: "opponentHigh" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const ownHighId = s.perm("ownHigh").permanentId;
    const opponentHighId = s.perm("opponentHigh").permanentId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea[0]?.permanentId).toBe(ownHighId);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(opponentHighId);
  });
});

describe("BT6-105 Gewalt Schwärmer — KB Q&A rulings", () => {
  it("can be used without a black card in play while you have a [Three Musketeers] Digimon (Q1489)", async () => {
    async function playOffBoard(ownBoard: string[], opponentBoard: string[]) {
      const s = setupEngine(
        { 0: { battleArea: ownBoard, hand: [{ card: "BT6-105", as: "option" }] }, 1: { battleArea: opponentBoard } },
        { autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      return { s, result: s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId }) };
    }

    const withoutMusketeers = await playOffBoard(["BT1-009"], ["BT6-017"]);
    expect(withoutMusketeers.result).toEqual({ ok: false, reason: "color-requirement-unmet" });
    expect(withoutMusketeers.s.state.memory).toBe(10);

    const withMusketeers = await playOffBoard(["BT6-017"], []);
    expect(withMusketeers.result).toEqual({ ok: true });
    await settle(() => withMusketeers.s.state.memory === 3);
    expect(withMusketeers.s.state.memory).toBe(3);
  });

  it("also deletes your own Digimon with play costs of 7 or less (Q1490)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-017", as: "musketeer" },
            { card: "BT1-024", as: "ownCostSeven" },
            { card: "BT9-053", as: "ownCostEight" },
          ],
          hand: [{ card: "BT6-105", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-042", as: "opponentCostSeven" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const survivors = [s.perm("musketeer").permanentId, s.perm("ownCostEight").permanentId];
    const ownCostSeven = s.inst("ownCostSeven").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(survivors);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === ownCostSeven)).toBe(true);
  });
});
