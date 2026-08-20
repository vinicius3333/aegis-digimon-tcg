import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-074.js";

describe("EX8-074", () => {
  it("reduces its play cost by 4 by suspending 2 Digimon and has Alliance and Vortex", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldBePlayed", actions: [{ mode: "reduceCost", amount: 4, cost: { kind: "suspend", target: { count: 2 } } }] });
    expect(compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? [])).toEqual(expect.arrayContaining([{ keyword: "Alliance", raw: "＜Alliance＞" }, { keyword: "Vortex", raw: "＜Vortex＞" }]));
  });
  it("suspends a Digimon, deletes an opposing Digimon up to 8000 DP, and can activate an opponent's When Digivolving effect once per turn", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "Suspend", optional: true });
    expect(actions[1]).toMatchObject({ kind: "Delete", optional: true, target: { filter: { dp: { op: "lte", value: 8000 } } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "ActivateEffect", effectType: "WhenDigivolving", optional: true }] });
  });
});
