import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-051.js";

describe("BT20-051 Raptordramon", () => {
  it("optionally plays Kota Domoto when there is at most one own Tamer", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({ actions: [{ kind: "PlayWithoutCost", optional: true, from: ["hand"], payCost: false, target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Kota Domoto"], match: "name" }] }, count: 1 }, condition: { kind: "permanentCount", seat: "mine", filter: { kind: ["Tamer"] }, op: "lte", value: 1 } }] });
  });

  it("grants inherited +2000 DP during the opponent's turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "OpponentsTurn", actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }] });
  });
});
