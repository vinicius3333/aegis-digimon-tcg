import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-037.js";

describe("BT20-037 Chaosmon: Valdur Arm", () => {
  it("scales suspension and memory by level 6 stack cards, then disables opponent On Play and unsuspend", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect).toMatchObject({ actions: [
      { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } }, scaling: { per: 1, unit: "digivolutionCards", filter: { levels: [6] } } },
      { kind: "GainMemory", amount: 1, scaling: { per: 1, unit: "digivolutionCards", filter: { levels: [6] } } },
      { kind: "DisableTimingEffect", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: "all" }, timings: ["onPlay"], duration: "untilOpponentTurnEnd" },
      { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: "all" } },
    ] });
    expect(compiled.effects.filter((entry) => entry.keywords?.length)).toHaveLength(2);
  });
});
