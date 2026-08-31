import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-056.js";

describe("EX4-056 Crowmon", () => {
  it("may digivolve into Ravemon from hand when a purple Tamer is in play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      optional: true,
      into: { nameOrTrait: [{ match: "name", tokens: ["Ravemon"] }] },
      condition: { kind: "youHave", filter: { kind: ["Tamer"], colors: ["Purple"] } },
    });
  });
  it("inherits deletion of an opposing level five or lower Digimon outside battle", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 5 } } },
          condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
        },
      ],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-056");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-056");
});
