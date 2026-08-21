import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-243.js";

describe("P-243 Digiseabass", () => {
  it("requires DM and trashes a hand card to draw two and place itself", () => {
    const effects = runtimeCompiledCard("P-243")!.effects;
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
          expect.objectContaining({ kind: "Draw", amount: 2, cost: expect.objectContaining({ kind: "trash" }) }),
          { kind: "PlaceInBattleAreaSelf" },
        ],
      }),
    );
  });

  it("arms Delay only when the opponent has a Digimon and returns a DM Digimon before playing", () => {
    const effects = runtimeCompiledCard("P-243")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourTurn",
        actions: [
          expect.objectContaining({
            kind: "GainKeyword",
            duration: "permanent",
            condition: expect.objectContaining({ kind: "opponentHas" }),
          }),
          expect.objectContaining({
            kind: "PlayWithoutCost",
            requiresDelayArmed: true,
            from: ["trash"],
            optional: true,
            target: expect.objectContaining({ filter: expect.objectContaining({ playCostLte: 3 }) }),
            cost: expect.objectContaining({ kind: "return", raw: expect.stringContaining("top of your deck") }),
          }),
        ],
      }),
    );
  });

  it("plays a qualifying DM card from hand or trash through Security", () => {
    expect(runtimeCompiledCard("P-243")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true })],
      }),
    );
  });
});
