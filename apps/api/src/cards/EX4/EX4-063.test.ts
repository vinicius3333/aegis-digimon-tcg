import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-063.js";

describe("EX4-063 Henry Wong & Shu-Chong Wong", () => {
  it("plays Terriermon or Lopmon with the one-or-fewer Digimon gate and restricts it", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", condition: { kind: "youHave", filter: { kind: ["Digimon"] } } });
    expect(actions?.[1]).toMatchObject({ kind: "Restrict", target: { filter: { targetPlayedByThisEffect: true } }, restriction: "digivolve" });
  });
  it("uses digivolution-card name matching for the erratared cost reduction", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({ kind: "Replacement", sourceFilter: { digivolutionStackNameOrTrait: [{ match: "name", tokens: ["Terriermon", "Lopmon"] }] }, actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }] });
  });
});
