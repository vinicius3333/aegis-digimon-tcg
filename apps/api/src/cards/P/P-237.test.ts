import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-237.js";

describe("P-237 Unique Emblem: Machina's Ascension", () => {
  it("requires Maquinamon in text and plays Maquinamon or Unchained", () => {
    const effects = runtimeCompiledCard("P-237")!.effects;
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
          expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true }),
          { kind: "PlaceInBattleAreaSelf" },
        ],
      }),
    );
  });

  it("grants Delay when an Unchained is played and digivolves from hand", () => {
    const effects = runtimeCompiledCard("P-237")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenPlayed" })],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
        actions: [expect.objectContaining({ kind: "Digivolve", from: ["hand"], payCost: false, optional: true })],
      }),
    );
  });

  it("activates its Main effects from Security", () => {
    expect(runtimeCompiledCard("P-237")!.effects).toContainEqual(
      expect.objectContaining({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] }),
    );
  });
});
