import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-008.js";

describe("EX6-008 Ludomon", () => {
  it("pays 1 and places itself under a level 4 or Legend-Arms Digimon to give +4000 DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 4000, cost: { kind: "payAndPlaceUnder", payCost: 1, placeThis: true, position: "bottom" } });
  });
  it("inherits +2000 DP and grants Raid and Piercing when a digivolution card is added", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "onAddDigivolutionCards", actions: [{ kind: "GainKeyword", keyword: { keyword: "Raid" } }, { kind: "GainKeyword", keyword: { keyword: "Piercing" } }] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000 });
  });
});
