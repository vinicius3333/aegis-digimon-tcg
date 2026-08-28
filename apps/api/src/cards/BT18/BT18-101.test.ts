import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-101.js";

describe("BT18-101 Lucemon: Satan Mode", () => {
  it("proves the Larva-to-empty-breeding cost and opponent deletion target", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          breeding: true,
          payCost: false,
          optional: true,
          target: {
            filter: { controller: "mine", zone: "trash", nameOrTrait: [{ tokens: ["Lucemon: Larva"], match: "name" }] },
          },
        },
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } },
      ],
    });
  });

  it("makes Q3053 mandatory by binding the security-trash result before both fallback deletions", () => {
    expect(compiled.effects[1]).toMatchObject({
      trigger: "EndOfAllTurns",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SecurityManipulation", op: "trash", from: ["security"], bindResultAs: "trashedSecurity" },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] } },
          condition: { kind: "bindingEmpty", ref: "trashedSecurity" },
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Tamer"] } },
          condition: { kind: "bindingEmpty", ref: "trashedSecurity" },
        },
      ],
    });
  });
});
