import { describe, expect, it } from "vitest";
import { compiled as BT24_097 } from "./BT24-097.js";
import "../index.js";

describe("BT24-097 Chaosmon: Valdur Arm", () => {
  it("deletes a level 6+ Digimon and may link this Option to one of yours", () => {
    expect(BT24_097.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "WaiveColorRequirement",
    });
    expect(BT24_097.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "ActivateMain",
    });
    const main = BT24_097.effects?.find((entry) => entry.trigger === "Main");
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
        count: 1,
      },
    });
    expect(main?.actions?.[1]).toMatchObject({
      kind: "Link",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      payCost: false,
      optional: true,
    });
  });
});
