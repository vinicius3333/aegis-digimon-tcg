import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-054.js";

describe("EX9-054", () => {
  it("de-digivolves one on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "DeDigivolve", amount: 1 }] });
  });
  it("plays a Negamon-text Digimon from hand on deletion with a level limit scaled by Negamon cards", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0] as any;
    expect(action).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], target: { filter: { levelComparison: { op: "lte", value: 4 } } } });
    expect(action?.target?.filter?.nameOrTrait).toContainEqual({ tokens: ["Negamon"], match: "text" });
  });
  it("scales the optional deletion play limit by every two Negamon-text cards in trash or stacks", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
    optional: true,
    from: ["hand"],
    payCost: false,
    target: {
      filter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Negamon"], match: "text" }],
        levelComparison: {
          op: "lte",
          value: 4,
          scaling: {
            per: 2,
            unit: "cards",
            filter: { zone: ["trash", "digivolutionCards"], controller: "mine", nameOrTrait: [{ tokens: ["Negamon"], match: "text" }] },
          },
        },
      },
    },
  }));
  it("inherits once-per-turn unsuspend when an Abbadomon attack target switches", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenAttackTargetSwitched", actions: [{ kind: "Unsuspend" }] }] }));
});
