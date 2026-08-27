import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-065.js";

describe("EX4-065 Trident Gaia", () => {
  it("deletes the highest-DP opposing Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "highestDP" } },
    });
  });
  it("trashes the opponent's top security after a 13000-DP own Digimon deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[1]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { controller: "opponent", dp: { op: "gte", value: 13000 } },
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.isSecurity).toBe(true);
  });
});
