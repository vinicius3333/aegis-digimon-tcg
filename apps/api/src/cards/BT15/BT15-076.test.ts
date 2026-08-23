import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-076.js";

describe("BT15-076", () => {
  it("may play a purple level 3 Digimon or Tamer from trash on play or digivolving", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
    });
  });
});
