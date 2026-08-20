import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-045.js";
import "../index.js";

describe("BT22-045 WezenGammamon", () => {
  it("uses the Gammamon hand card as the cost for Blocker and +3000 DP", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toHaveLength(2);
      expect(effect?.actions[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          position: "bottom",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }] },
            count: 1,
            from: ["hand"],
          },
        },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "ModifyDP",
        amount: 3000,
        duration: "untilOpponentTurnEnd",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      });
    }
  });

  it("retains inherited Piercing", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toMatchObject([{ keyword: "Piercing" }]);
  });

  it("places a Gammamon from hand, gains Blocker, and reaches 8000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT22-045", as: "wezen" },
            { card: "BT8-008", as: "gammamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wezen").instanceId })).toEqual({ ok: true });
    await settle();
    const wezen = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT22-045")!;

    expect(wezen.stack.some((card) => card.cardId === "BT8-008")).toBe(true);
    expect(wezen.currentDP).toBe(8000);
    expect(observe(s.engine).hasKeyword(wezen, "Blocker")).toBe(true);
  });

  it("gets neither Blocker nor DP when the Gammamon cost is unavailable", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT22-045", as: "wezen" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wezen").instanceId })).toEqual({ ok: true });
    await settle();
    const wezen = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT22-045")!;

    expect(wezen.currentDP).toBe(5000);
    expect(observe(s.engine).hasKeyword(wezen, "Blocker")).toBe(false);
  });
});
