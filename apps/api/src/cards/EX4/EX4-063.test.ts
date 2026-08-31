import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-063.js";

describe("EX4-063 Henry Wong & Shu-Chong Wong", () => {
  it("plays Terriermon or Lopmon with the one-or-fewer Digimon gate and restricts it", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      condition: { kind: "permanentCount", op: "lte", value: 1, filter: { kind: ["Digimon"] } },
    });
    expect(actions?.[1]).toMatchObject({
      kind: "Restrict",
      target: { filter: { boundRef: "playedByStartEffect" } },
      restriction: "digivolve",
    });
    expect(actions?.[2]).toMatchObject({ kind: "DelayedDelete", timing: "endOfOpponentTurn" });
  });
  it("uses digivolution-card name matching for the erratared cost reduction", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      sourceFilter: { digivolutionStackNameOrTrait: [{ match: "name", tokens: ["Terriermon", "Lopmon"] }] },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-063");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-063");
});
