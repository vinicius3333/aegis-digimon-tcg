import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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

  it("makes matching Knightmon names unblockable for both players only during your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-042", as: "subject" },
          { card: "EX4-021", as: "ownKnight" },
          { card: "BT1-009", as: "ownOther" },
        ],
      },
      1: {
        battleArea: [
          { card: "EX4-021", as: "opponentKnight" },
          { card: "BT1-009", as: "opponentOther" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.None, s.perm("subject"));

    expect(observe(s.engine).isRestricted(s.perm("subject"), "cantBeBlocked")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("ownKnight"), "cantBeBlocked")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentKnight"), "cantBeBlocked")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("ownOther"), "cantBeBlocked")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("opponentOther"), "cantBeBlocked")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(s.perm("subject"), "cantBeBlocked")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("ownKnight"), "cantBeBlocked")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("opponentKnight"), "cantBeBlocked")).toBe(false);
  });
  ex4CardBehaviorTests("EX4-042");
});
