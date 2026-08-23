import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST14-03.js";
import "./ST14-12.js";

describe("ST14-12 Rivals' Barrage", () => {
  it("uses Delay on a later turn to trash itself and return a purple card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST14-03", as: "miller" }],
          deck: [{ card: "ST14-12", as: "barrage-card" }, "BT1-009"],
          trash: [{ card: "ST14-02", as: "impmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("miller").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "ST14-12"));
    const barrage = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "ST14-12")!;
    barrage.enterFieldTurnCount = 4294967295;
    await advance(s.engine).fire(EffectTiming.OnDeclaration, barrage);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "ST14-12")).toBe(false);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "ST14-02")).toBe(true);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "ST14-12")).toBe(true);
  });

  it("deletes an opponent's highest-level Digimon in security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST14-12", as: "security-barrage" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-015", as: "level4" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security-barrage"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-009");
  });
});
