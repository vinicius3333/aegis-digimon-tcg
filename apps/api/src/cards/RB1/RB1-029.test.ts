import { describe, expect, it } from "vitest";
import { compiled } from "./RB1-029.js";

describe("RB1-029 GulusGammamon", () => {
  it("deletes itself for the end-of-attack clause and plays a suspended Gammamon on deletion", () => {
    expect(compiled.effects).toMatchObject([
      {
        trigger: "EndOfAttack",
        actions: [
          {
            kind: "Delete",
            cost: { kind: "deleteOwn" },
            target: { filter: { controller: "opponent", kind: ["Digimon"] } },
          },
        ],
      },
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            suspended: true,
            target: { filter: { nameOrTrait: [{ match: "name", tokens: ["Gammamon"] }] } },
          },
        ],
      },
    ]);
  });
});
