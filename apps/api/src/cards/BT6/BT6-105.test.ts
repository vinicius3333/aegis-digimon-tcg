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
