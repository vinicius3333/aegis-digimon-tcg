import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-042.js";

describe("EX4-042 DarkMaildramon", () => {
  it("makes itself and all own Knightmon/Knightsmon unblockable for the turn", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "GainKeyword", target: { filter: { isSelfRef: true } }, keyword: { keyword: "Unblockable" }, duration: "forTheTurn" });
    expect(actions?.[1]).toMatchObject({ kind: "GainKeyword", target: { count: "all", filter: { nameOrTrait: [{ match: "name", tokens: ["Knightmon", "Knightsmon"] }] } } });
  });

  it("grants Unblockable to itself and an own Knightmon during the turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX4-042", as: "source" }, { card: "BT5-042", as: "knight" }] } });
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.None, s.perm("source"));

    expect(observe(s.engine).hasKeyword(s.perm("source"), "Unblockable")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("knight"), "Unblockable")).toBe(true);
  });
});
