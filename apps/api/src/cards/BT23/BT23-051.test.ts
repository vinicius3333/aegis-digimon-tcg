import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-051.js";

describe("BT23-051 Golemon", () => {
  it("declares Alliance and Blocker", () => {
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Alliance", "Blocker"]);
  });

  it("once per turn deletes one opposing Digimon at 4000 DP or less when this Golemon suspends", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", dp: { op: "lte", value: 4000 } }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("cannot attack opponent Digimon during your turn", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(action).toMatchObject({
      kind: "Restrict",
      restriction: "attack",
      duration: "permanent",
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
  });
});
