import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-065.js";

describe("BT15-065", () => {
  it("may trash a Numemon to de-digivolve an opposing Digimon to level 3 on play or digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "DeDigivolve", amount: 1, stopAtLevel: 3, cost: { kind: "trash" }, optional: true }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "DeDigivolve", amount: 1, stopAtLevel: 3 }] });
  });
  it("may place a Numemon from trash to restrict low-cost opposing attacks", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Restrict", restriction: "attackPlayers", target: { count: "all" }, cost: { kind: "place" }, optional: true }] }));
});
