import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-034.js";
import "../index.js";
describe("BT26-034 Palmon", () => {
  it("compiles the conditional free hand digivolution", () => {
    expect(digivolutionRequirementsFor("BT26-034")).toContainEqual({
      level: 2,
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: { kind: "memoryAtMost", value: 4 },
        },
      ],
    });
  });
  it("free-digivolves a Vegetation card at four memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-034", as: "palmon", under: ["BT26-001"] }],
          hand: [{ card: "BT25-047", as: "vegetation" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("palmon"));
    expect(s.perm("palmon").topCard.cardId).toBe("BT25-047");
  });
});
