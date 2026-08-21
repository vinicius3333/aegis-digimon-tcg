import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-071.js";

describe("BT17-071 Ornismon", () => {
  it("requires both stack names before playing Ornismon after deleting another Digimon", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0];
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: { nameOrTrait: [{ tokens: ["Darcmon", "HippoGryphonmon"], match: "name" }] },
      },
      cost: { kind: "deleteOwn", target: { filter: { controller: "mine", excludeSelf: true }, count: 1 } },
    });
  });

  it("deletes an opposing Digimon no higher than the Digimon deleted by the trigger", () => {
    const action = compiled.effects.find((entry) => entry.frequency === "OncePerTurn")?.actions[0];
    expect(action).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { controller: "mine", excludeSelf: true },
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", levelComparison: { op: "lte", relativeTo: "lastDeleted" } }, count: 1 } }],
    });
  });
});
