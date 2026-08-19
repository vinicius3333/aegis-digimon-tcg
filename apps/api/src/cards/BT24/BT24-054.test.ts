import { describe, expect, it } from "vitest";
import { compiled as BT24_054 } from "./BT24-054.js";

describe("BT24-054 Ryudamon", () => {
  it("limits the inherited suspension target by this Digimon's play cost", () => {
    const inherited = BT24_054.effects?.find((entry) => entry.isInherited);
    expect((inherited?.actions?.[0] as any).actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLteTriggerSource: true } },
    });
  });
  it("responds to your Shuu Yulin being played with optional Hisyaryumon digivolution", () => {
    const effect = BT24_054.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed" });
    expect((effect?.actions?.[0] as any).actions?.[0]).toMatchObject({
      kind: "Digivolve",
      payCost: true,
      costOverride: 3,
      ignoreRequirements: true,
      optional: true,
    });
  });
});
