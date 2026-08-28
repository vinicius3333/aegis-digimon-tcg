import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-238.js";

describe("P-238 Destruction Cannon", () => {
  it("requires CS, deletes an opposing level 6 or lower Digimon, and places itself", () => {
    const effects = runtimeCompiledCard("P-238")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        actions: [
          expect.objectContaining({
            kind: "WaiveColorRequirement",
            condition: expect.objectContaining({ kind: "youHave" }),
          }),
        ],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        actions: [
          expect.objectContaining({
            kind: "Delete",
            target: expect.objectContaining({ filter: expect.objectContaining({ controller: "opponent" }) }),
          }),
          { kind: "PlaceInBattleAreaSelf" },
        ],
      }),
    );
  });

  it("permanently grants Delay after a CS Digimon attacks", () => {
    const effects = runtimeCompiledCard("P-238")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenAttacking",
            sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
            actions: [expect.objectContaining({ kind: "GainKeyword", duration: "permanent" })],
          }),
        ],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({ trigger: "Main", keywords: [{ keyword: "Delay", raw: "＜Delay＞" }] }),
    );
  });

  it("deletes and places itself from Security", () => {
    expect(runtimeCompiledCard("P-238")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [expect.objectContaining({ kind: "Delete" }), { kind: "PlaceInBattleAreaSelf" }],
      }),
    );
  });
});
