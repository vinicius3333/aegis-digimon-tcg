import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-027.js";

describe("BT26-027 Petermon", () => {
  it("models both printed timing windows and suspension cost", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["WG"], cost: 2 }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            expect.objectContaining({
              kind: "GainKeyword",
              keyword: { keyword: "SecurityAttack", amount: -2 },
              duration: "untilOpponentTurnEnd",
              cost: {
                kind: "suspend",
                target: { filter: expect.objectContaining({ controllerDefault: "mine", kind: ["Digimon"] }), count: 1 },
              },
            }),
          ],
        }),
        expect.objectContaining({ trigger: "StartOfOpponentsMainPhase" }),
      ]),
    );
  });

  it("publicly pays by suspending an eligible WG Digimon and removes two Security Attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-024", as: "cost" }], hand: [{ card: "BT26-027", as: "petermon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petermon").instanceId })).toEqual({
      ok: true,
    });
    await advance(s.engine).settle();

    expect(s.perm("cost").isSuspended).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);
  });
});
