import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-075.js";

describe("BT19-075", () => {
  it("preserves hand-count scaling, Composite leave prevention, and deletion watcher", () => {
    const card = runtimeCompiledCard("BT19-075");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "Trash", chooser: "opponent", trackCount: "trashedThisEffect", target: { untilHandSize: 5 } },
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Tamer"] } },
            scaling: { per: 2, unit: "namedCount", countSource: "trashedThisEffect" },
          },
        ],
      })),
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            actions: [{ kind: "Prevent", mode: "leavePlay", cost: { kind: "deleteOwn" }, optional: true }],
          },
        ],
      },
      {
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [{ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "Trash" }] }],
      },
    ]);
  });
});
