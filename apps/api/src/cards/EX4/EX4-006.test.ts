import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-006.js";

describe("EX4-006 Guilmon", () => {
  it("gains Rush for the turn on play when both trashes total at least 20 cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Rush" }, duration: "forTheTurn", condition: { kind: "combinedTrashCount", op: "gte", value: 20 } });
  });
  it("uses the zero-cost Gigimon alternate digivolution requirement", () => {
    expect(compiled.digivolutionRequirement).toContainEqual(expect.objectContaining({ names: ["Gigimon"], cost: 0 }));
  });
});
