import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-083.js";

describe("BT16-083", () => {
  it("returns all Tamers, optionally plays one from hand, and plays Ukkomon from trash on deletion", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "Return", to: "hand", target: { count: "all" } }, { kind: "PlayWithoutCost", payCost: false, optional: true, abortOnDecline: true }, { kind: "PlayWithoutCost", from: ["trash"], payCost: false }] });
  });

  it("deletes the lowest-level opponent Digimon and may hatch at end of turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "EndOfYourTurn", frequency: "OncePerTurn", actions: [{ kind: "Delete", optional: true, abortOnDecline: true, cost: { kind: "return", target: { count: 1 } }, target: { filter: { superlative: "lowestLevel" } } }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, breeding: true, optional: true }] });
  });
});
