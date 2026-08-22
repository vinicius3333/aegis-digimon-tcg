import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-14 Barbamon", () => {
  it("trashes the opponent's hand down to six on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST22-14", as: "barbamon" }] },
        1: { hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("barbamon"));
    await settle(() => s.state.players[1]!.hand.length === 6);
    expect(s.state.players[1]!.hand).toHaveLength(6);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("deletes the opponent's lowest-level Digimon after the hand is five or fewer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST22-14", as: "barbamon" }] },
        1: {
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          battleArea: [
            { card: "BT1-009", as: "lowLevel" },
            { card: "BT1-020", as: "highLevel" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowLevelId = s.perm("lowLevel").permanentId;
    const highLevelId = s.perm("highLevel").permanentId;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("barbamon"));
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === lowLevelId));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === lowLevelId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === highLevelId)).toBe(true);
  });
});
