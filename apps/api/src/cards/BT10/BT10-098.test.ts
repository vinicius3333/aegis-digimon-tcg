import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-098.js";

describe("BT10-098 Plasma Deckerdra Launcher", () => {
  it("reduces its use cost by 2 with 2 opposing Digimon and returns only level 6 or higher", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: ["BT10-017"], hand: [{ card: "BT10-098", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT10-085", as: "level6" },
            { card: "BT10-043", as: "lowerLevel" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    const level6TopId = s.perm("level6").topCard.instanceId;
    const lowerId = s.perm("lowerLevel").permanentId;
    preferred.push(s.perm("level6").permanentId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === level6TopId));

    expect(s.state.memory).toBe(5);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowerId)).toBe(true);
  });

  it("pays the full use cost when the opponent has only 1 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT10-017"], hand: [{ card: "BT10-098", as: "option" }] },
        1: { battleArea: [{ card: "BT10-085", as: "level6" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT10-085"));

    expect(s.state.memory).toBe(3);
  });

  it("Security returns any opposing Digimon to its owner's deck", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { security: [{ card: "BT10-098", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "BT10-043", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const targetTopId = s.perm("target").topCard.instanceId;
    preferred.push(s.perm("target").permanentId);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[1]!.deck.some((card) => card.instanceId === targetTopId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
