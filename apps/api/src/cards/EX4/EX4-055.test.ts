import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-055.js";

describe("EX4-055 Peckmon", () => {
  it("optionally plays Keenan Crier from hand if none is in play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, condition: { kind: "youHaveNone" } });
  });
  it("inherits opponent-chosen hand trashing when deleted outside battle", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({ kind: "Trash", chooser: "opponent", target: { filter: { controller: "opponent", zone: "hand" } }, condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } } });
  });
});
