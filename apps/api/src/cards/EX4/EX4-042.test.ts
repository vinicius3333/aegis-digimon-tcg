import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-042.js";

describe("EX4-042 DarkMaildramon", () => {
  it("makes itself and all own Knightmon/Knightsmon unblockable for the turn", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      target: { filter: { isSelfRef: true } },
      grant: { keyword: "Unblockable" },
      duration: "forTheTurn",
    });
    expect(actions?.[1]).toMatchObject({
      kind: "GrantStatic",
      target: { count: "all", filter: { nameOrTrait: [{ match: "name", tokens: ["Knightmon", "Knightsmon"] }] } },
    });
    const secondTarget = (actions?.[1] as { target?: { filter?: unknown } } | undefined)?.target;
    expect(secondTarget?.filter).not.toHaveProperty("controllerDefault");
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-042");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-042");
});
