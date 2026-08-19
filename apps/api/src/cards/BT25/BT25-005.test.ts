import { describe, expect, it } from "vitest";
import { compiled as BT25_005 } from "./BT25-005.js";
import "../index.js";

describe("BT25-005 Pagumon", () => {
  it("digivolves this Digimon when a Three Musketeers card is added underneath", () => {
    const effect = BT25_005.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    const watcher = effect?.actions?.[0] as {
      event?: string;
      sourceFilter?: unknown;
      triggerFilter?: unknown;
      addedDigivolutionCardFilter?: unknown;
    };
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controllerDefault: "mine" },
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: {
        nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
      },
    });
    expect((watcher as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "Digivolve",
      reduceCost: 2,
      from: ["hand"],
      optional: true,
    });
  });
});
