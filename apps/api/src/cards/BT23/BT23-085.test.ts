import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-085.js";

describe("BT23-085 Ryuji Mishima", () => {
  it("gains memory when a CS Digimon is present", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any;
    expect(effect.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "youHave" } });
  });

  it("grants one Hudie Digimon DP-reduction immunity, Reboot, and Blocker", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "OnPlay") as any).actions;
    expect(actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "dpImmune",
      byOpponentEffectsOnly: true,
      duration: "untilOpponentTurnEnd",
    });
    expect(actions.slice(1).map((action: any) => action.keyword.keyword)).toEqual(["Reboot", "Blocker"]);
    expect(actions.every((action: any) => action.target.sameTarget === true || action === actions[0])).toBe(true);
  });

  it("uses a single-color CS Option from hand when a Hudie Digimon suspends", () => {
    const watcher = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
    });
    expect(watcher.actions[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      from: ["hand"],
      filter: { kind: ["Option"], singleColor: true },
      optional: true,
    });
  });
});
