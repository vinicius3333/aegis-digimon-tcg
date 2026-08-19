import { describe, expect, it } from "vitest";
import { compiled as BT24_055 } from "./BT24-055.js";

describe("BT24-055 Ginryumon", () => {
  it("limits the inherited suspension target to the source's play cost", () => {
    const inherited = BT24_055.effects?.find((entry) => entry.isInherited);
    const action = inherited?.actions?.[0] as any;
    expect(action).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(action.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLteTriggerSource: true } },
    });
  });
  it("requires Shuu Yulin as the On Play/When Digivolving placement cost", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = BT24_055.effects?.find((entry) => entry.trigger === trigger);
      const action = effect?.actions?.[0] as any;
      expect(action.optional).toBeUndefined();
      expect(action.abortOnDecline).toBeUndefined();
      expect(action.cost).toMatchObject({ kind: "place", position: "bottom" });
    }
  });
});
