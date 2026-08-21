import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-061.js";

describe("EX5-061 Cerberusmon (X Antibody)", () => {
  it("plays a purple level 3 Digimon from trash without cost on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"], levels: [3] } },
    });
  });
  it("draws, trashes, and reactivates On Play when Cerberusmon or X Antibody is in the stack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } } },
      {
        kind: "ReactivateEffect",
        fromTrigger: "OnPlay",
        count: 1,
        condition: {
          kind: "selfDigivolutionStackHasTrait",
          filter: {
            nameOrTrait: [
              { match: "name", tokens: ["Cerberusmon"] },
              { match: "name", tokens: ["X Antibody"] },
            ],
          },
        },
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          optional: true,
          cost: {
            kind: "deleteOwn",
            target: { count: 1, filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] } },
          },
        },
      ],
    });
  });
});
