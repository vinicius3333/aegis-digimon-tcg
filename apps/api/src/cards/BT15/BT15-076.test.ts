import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-076.js";

describe("BT15-076", () => {
  it("offers this hand card as a Counter-time Digivolve destination", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          source: "triggerSource",
          payCost: false,
          optional: true,
          into: { cardId: "BT15-076", kind: ["Digimon"] },
        },
      ],
    });
  });

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

  it("has the printed Blocker keyword", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }],
    });
  });
});
