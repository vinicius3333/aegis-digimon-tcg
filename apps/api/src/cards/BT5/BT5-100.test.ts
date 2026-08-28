import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-100.js";

describe("BT5-100 Royal Nuts", () => {
  it("reveals five, adds exactly one Digisorption Digimon, and bottoms the rest", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT5-046"],
          hand: [{ card: "BT5-100", as: "option" }],
          deck: [
            { card: "BT5-058", as: "digisorption" },
            { card: "BT2-045", as: "secondDigisorption" },
            { card: "BT1-009", as: "miss1" },
            { card: "BT1-010", as: "miss2" },
            { card: "BT1-011", as: "miss3" },
            { card: "BT1-012", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("secondDigisorption").instanceId);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("secondDigisorption").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondDigisorption").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("digisorption").instanceId);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("unrevealed").instanceId);
    expect(s.state.players[0]!.deck.slice(1).map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("digisorption").instanceId,
        s.inst("miss1").instanceId,
        s.inst("miss2").instanceId,
        s.inst("miss3").instanceId,
      ]),
    );
  });

  it("bottoms all five cards when none has Digisorption", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT5-046"],
          hand: [{ card: "BT5-100", as: "option" }],
          deck: [
            { card: "BT1-009", as: "miss1" },
            { card: "BT1-010", as: "miss2" },
            { card: "BT1-011", as: "miss3" },
            { card: "BT1-012", as: "miss4" },
            { card: "BT1-013", as: "miss5" },
            { card: "BT1-014", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 6);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("unrevealed").instanceId);
    expect(s.state.players[0]!.deck.slice(1).map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("miss1").instanceId,
        s.inst("miss2").instanceId,
        s.inst("miss3").instanceId,
        s.inst("miss4").instanceId,
        s.inst("miss5").instanceId,
      ]),
    );
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-100", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});
