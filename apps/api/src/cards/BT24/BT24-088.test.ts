import { describe, expect, it } from "vitest";
import { compiled as BT24_088 } from "./BT24-088.js";
import "../index.js";

describe("BT24-088 Asuna Shiroki", () => {
  it("returns itself to the bottom of the deck before the optional trash play", () => {
    const start = BT24_088.effects?.find((entry) => entry.trigger === "StartOfYourTurn");
    expect(start?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      condition: { kind: "memoryAtMost", value: 4 },
      cost: { kind: "return", to: "deckBottom", target: { filter: { isSelfRef: true }, isSelf: true } },
      optional: true,
      abortOnDecline: true,
    });
    expect(BT24_088.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: { filter: { isSelfRef: true }, isSelf: true },
      payCost: false,
    });
  });
});
