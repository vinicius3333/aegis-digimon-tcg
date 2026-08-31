import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-065.js";

describe("EX4-065 Trident Gaia", () => {
  it("deletes the highest-DP opposing Digimon", () => {
    expect(
      compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.find((action) => action.kind === "Delete"),
    ).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "highestDP" } },
    });
  });
  it("trashes the opponent's top security after a 13000-DP own Digimon deletion", () => {
    expect(
      compiled.effects
        ?.find((entry) => entry.trigger === "Main")
        ?.actions?.find((action) => action.kind === "SubTrigger"),
    ).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { controller: "opponent", dp: { op: "gte", value: 13000 } },
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.isSecurity).toBe(true);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-065");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-065");
});
