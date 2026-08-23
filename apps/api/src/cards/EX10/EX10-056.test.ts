import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import compiled from "./EX10-056.js";

describe("EX10-056 Bagramon compiled contract", () => {
  it("records permanent relocation, shared watcher identity, and top-Security trash", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [expect.objectContaining({ kind: "PlaceUnder", position: "bottom", optional: true })],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [expect.objectContaining({ kind: "PlaceUnder" })],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          frequency: "OncePerTurn",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenOneOfYoursDigivolves",
              oncePerTurnKey: "EX10-056/all-turns",
            }),
            expect.objectContaining({
              kind: "SubTrigger",
              event: "onAddDigivolutionCards",
              oncePerTurnKey: "EX10-056/all-turns",
            }),
          ]),
        }),
      ]),
    );
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ targetIsPermanent: true });
    expect(irNode(compiled.effects?.[2]?.actions?.[0])?.actions?.[0]).toMatchObject({
      kind: "trashSecurityTop",
      controller: "opponent",
      count: 1,
      cost: { kind: "trash" },
    });
  });
});
