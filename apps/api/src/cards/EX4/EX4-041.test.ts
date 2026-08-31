import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-041.js";

describe("EX4-041 DeadlyAxemon", () => {
  it("draws two by optionally trashing a Blue Flare or Twilight card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Draw",
      amount: 2,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "trash",
        target: { filter: { nameOrTrait: [{ match: "trait", tokens: ["Blue Flare", "Twilight"] }] } },
      },
    });
  });
  it("reveals a Blue Flare or Twilight card on deletion and permanently gains 1000 DP inherited", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 1,
      rest: "trash",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-041");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-041");
});
