import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-064.js";
describe("EX7-064 Lighdramon", () => {
  it("gains memory when the opponent has a Digimon", () =>
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas" },
    }));
  it("grants Piercing and Blocker through the suspend cost and plays from security", () => {
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Piercing" },
      cost: { kind: "suspend" },
    });
    expect(compiled.effects?.[1]?.actions[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { sameTarget: true },
    });
    expect(compiled.effects?.find((e) => e.isSecurity)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    });
  });
});
