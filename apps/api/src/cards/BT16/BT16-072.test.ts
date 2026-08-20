import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-072.js";

describe("BT16-072", () => {
  it("models Blocker and trashes two purple cards among five revealed", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 5, rest: "deckBottom", add: [{ count: 2, to: "trash", filter: { colors: ["Purple"] } }] }] });
  });

  it("plays a distinct Myotismon-text Tamer from trash on deletion", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, notSameNameAs: ["battleArea"] }] });
  });
});
