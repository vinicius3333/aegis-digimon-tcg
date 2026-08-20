import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-054.js";

describe("EX6-054 Lucemon: Satan Mode", () => {
  it("deletes an opposing Digimon/Tamer, or trashes security and grants Recovery when deletion fails", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Delete", optional: true, controller: "opponent" }, { kind: "SecurityManipulation", op: "trashTop", condition: { kind: "ifThisEffectDidNotDelete" } }, { kind: "GainKeyword", keyword: { keyword: "Recovery", amount: 1 }, condition: { kind: "ifThisEffectDidNotDelete" } }]));
  it("inherits optional Lucemon return cost to play Satan Mode or a level 6 Demon Lord", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", optional: true, cost: { kind: "return", destination: "deck", position: "bottom" }, actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }] }));
});
