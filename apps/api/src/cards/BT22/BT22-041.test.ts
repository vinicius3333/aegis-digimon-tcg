import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-041.js";

describe("BT22-041 Kentaurosmon", () => {
  it("gates the play-cost reduction on total security, places a yellow hand card on top, and trashes top security to unsuspend", () => {
    const reduction = compiled.effects.find(
      (entry) => entry.trigger === "Static" && entry.actions[0]?.kind === "Replacement",
    );
    expect(reduction?.actions[0]).toMatchObject({
      event: "wouldBePlayed",
      mode: "reduceCost",
      amount: 6,
      condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "placeAsSecurity",
        from: ["hand"],
        source: { filter: { controllerDefault: "mine", colors: ["Yellow"] }, count: 1 },
        toTop: true,
        optional: true,
      });
    }
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [
            {
              kind: "Unsuspend",
              cost: {
                kind: "trash",
                target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
              },
            },
          ],
        },
      ],
    });
  });
});
