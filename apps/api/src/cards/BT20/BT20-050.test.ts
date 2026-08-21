import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-050.js";

describe("BT20-050 HoverEspimon", () => {
  it("flips the next face-down opposing security card when digivolving", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({ actions: [{ kind: "SecurityManipulation", op: "flipFaceUp", controller: "opponent" }] });
  });

  it("draws once at end of attack and grants inherited +1000 DP", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfAttack")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] });
  });
});
