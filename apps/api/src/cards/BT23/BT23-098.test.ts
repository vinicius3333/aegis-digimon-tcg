import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-098.js";

describe("BT23-098 Unique Emblem: Soul Banquet", () => {
  it("places itself after the optional Ghostmon/Violet Inboots play", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main") as any;
    expect(main.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true });
    expect(main.actions[0].abortOnDecline).toBeUndefined();
    expect(main.actions[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
  });

  it("activates Delay when Violet Inboots suspends and carries the Ghost/LIBERATOR digivolution", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    const digivolve = turn.actions[0].actions[0];
    expect(turn.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(turn.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(digivolve).toMatchObject({ kind: "Digivolve", reduceCost: 3, from: ["hand"], optional: true });
    expect(digivolve.into.allNameOrTraits).toEqual([
      { tokens: ["Ghost"], match: "trait" },
      { tokens: ["LIBERATOR"], match: "trait" },
    ]);
  });

  it("routes Security through the complete Main effect", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(security.actions).toEqual([{ kind: "ActivateMain" }]);
  });
});
