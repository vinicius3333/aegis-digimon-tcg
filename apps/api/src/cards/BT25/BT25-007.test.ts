import { describe, expect, it } from "vitest";
import { compiled as BT25_007 } from "./BT25-007.js";
import "../index.js";

describe("BT25-007 Gatchmon", () => {
  it("reveals three and adds one Appmon plus one qualifying trait card", () => {
    const effect = BT25_007.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const revealAdd = effect?.actions?.[0] as { add?: unknown } | undefined;
    expect(revealAdd?.add).toEqual([
      expect.objectContaining({ count: 1, to: "hand", filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] } }),
      expect.objectContaining({ count: 1, to: "hand", filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Social", "Tool", "Reboot", "Creation"], match: "trait" }] } }),
    ]);
  });
});
