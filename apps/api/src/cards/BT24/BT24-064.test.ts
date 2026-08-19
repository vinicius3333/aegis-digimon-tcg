import { describe, expect, it } from "vitest";
import { compiled as BT24_064 } from "./BT24-064.js";

describe("BT24-064 Ouryumon", () => {
  it("triggers De-Digivolve when any Digimon or Tamer suspends", () => {
    const allTurns = BT24_064.effects?.find((entry) => entry.trigger === "AllTurns");
    const subTrigger = allTurns?.actions?.[0] as any;
    expect(subTrigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { kind: ["Digimon", "Tamer"] },
    });
    expect(subTrigger.sourceFilter.controllerDefault).toBeUndefined();
    expect(subTrigger.actions?.[0]).toMatchObject({ kind: "DeDigivolve", amount: 2 });
  });
});
