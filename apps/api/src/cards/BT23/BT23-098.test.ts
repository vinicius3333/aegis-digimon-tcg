import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-098.js";

describe("BT23-098 Unique Emblem: Soul Banquet", () => {
  it("places itself after the optional Ghostmon/Violet Inboots play", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main") as any;
    expect(main.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true });
    expect(main.actions[0].abortOnDecline).toBeUndefined();
    expect(main.actions[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
  });

  it("arms Delay when Violet Inboots suspends and carries the Ghost/LIBERATOR digivolution", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    const gain = turn.actions[0].actions[0];
    expect(turn.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(gain.keyword).toMatchObject({ keyword: "Delay", option: { kind: "Digivolve", reduceCost: 3 } });
    expect(gain.keyword.option.into.allNameOrTraits).toEqual([
      { tokens: ["Ghost"], match: "trait" },
      { tokens: ["LIBERATOR"], match: "trait" },
    ]);
  });
});
