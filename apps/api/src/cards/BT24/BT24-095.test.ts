import { describe, expect, it } from "vitest";
import { compiled as BT24_095 } from "./BT24-095.js";
import "../index.js";

describe("BT24-095 Tiamat", () => {
  it("suspends and restricts an opposing permanent, then may self-link", () => {
    expect(BT24_095.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "WaiveColorRequirement",
    });
    expect(BT24_095.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "ActivateMain",
    });
    const main = BT24_095.effects?.find((entry) => entry.trigger === "Main");
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
    });
    expect(main?.actions?.[1]).toMatchObject({
      kind: "Restrict",
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    });
    expect(main?.actions?.[2]).toMatchObject({
      kind: "Link",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      payCost: false,
      optional: true,
    });
  });
});
