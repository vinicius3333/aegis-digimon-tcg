import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-101.js";

describe("BT23-101 Hudiemon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-101")).toMatchObject({
      cardId: "BT23-101",
      nameEn: "Hudiemon",
      colors: ["Green", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 7,
      dp: 7000,
      types: ["Insectoid", "Hudie", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("mandatorily scales one opponent's DP by every friendly Hudie after optional play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-101", as: "source" },
            { card: "BT23-101", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT23-101", as: "target" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("source").topCard!);
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("plays a low-cost CS card and applies the mandatory scaled DP reduction", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions as any[];
      expect(actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true });
      expect(actions[1]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" });
      expect(actions[1].optional).toBeUndefined();
      expect(actions[1].scaling.filter.nameOrTrait).toEqual([{ tokens: ["Hudie"], match: "trait" }]);
    }
  });

  it("reactivates the On Play effects with the printed CS Tamer return cost", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions?.[0] as any;
    expect(action).toMatchObject({
      kind: "ReactivateEffect",
      fromTrigger: "OnPlay",
      count: 1,
      optional: true,
      cost: { kind: "return" },
    });
  });

  it("carries both exact alternate digivolution paths and the four-Hudie-Tamer gate", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["CS"], cost: 4, isAlternate: true },
      {
        namesExact: ["Erika Mishima"],
        cost: 3,
        isAlternate: true,
        controllerControls: { kind: ["Tamer"], traits: ["Hudie"], min: 4 },
      },
    ]);
  });
});
