import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-235.js";

describe("P-235 Digital Accident Tactics Squad", () => {
  it("requires a DATA SQUAD trait card and reveals three cards", () => {
    const effects = runtimeCompiledCard("P-235")!.effects;
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
          expect.objectContaining({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }),
          { kind: "PlaceInBattleAreaSelf" },
        ],
      }),
    );
  });

  it("gains two memory through Delay", () => {
    expect(runtimeCompiledCard("P-235")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
        actions: [{ kind: "GainMemory", amount: 2 }],
      }),
    );
  });

  it("places itself in the battle area from Security", () => {
    expect(runtimeCompiledCard("P-235")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlaceInBattleAreaSelf" }],
      }),
    );
  });
});
