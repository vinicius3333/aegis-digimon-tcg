import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-093.js";

describe("BT20-093 Unleash the Dragon Gene", () => {
  it("keeps the optional reduced play and mandatory placement sequence", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 3, optional: true },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("grants Delay without preventing the qualifying Digimon from leaving", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [{
        kind: "Replacement",
        event: "wouldLeavePlay",
        leaveCause: "otherThanBattle",
        actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" }, duration: "permanent" }],
      }],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0]).not.toHaveProperty("mode", "prevent");
  });
});
