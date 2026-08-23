import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-088.js";

describe("BT15-088", () => {
  it("may play a red Tamer costing 4 or less and return a red Digimon from trash with Sora", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Return",
      to: "hand",
      condition: { kind: "youHave" },
      optional: true,
    });
  });
  it("may play Biyomon from hand or trash and returns itself from security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "AddToHandSelf" },
      ],
    }));
});
