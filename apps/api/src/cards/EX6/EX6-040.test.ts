import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-040.js";

describe("EX6-040 TiaLudomon", () => {
  it("places itself under a level 4 or Legend-Arms Digimon for +2000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      target: { fromSelectionRef: "digivolveHost" },
      cost: { kind: "place", position: "bottom", bindHostAs: "digivolveHost" },
      additionalCost: { kind: "payMemory", memory: 1 },
    }));
  it("grants Blocker and Reboot on stack addition and inherits +2000 DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
        { kind: "GainKeyword", keyword: { keyword: "Reboot" } },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
    });
  });
});
