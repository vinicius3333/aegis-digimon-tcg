import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-021.js";

describe("BT24-021 SnowGoblimon", () => {
  it("reveals three cards for one Demon/Shaman Digimon and one Titan card", () => {
    const reveal = compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions?.[0] as any;
    expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(reveal.add).toHaveLength(2);
  });

  it("digivolves this Demon/Titan Digimon from trash after the hand is trashed", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    const action = inherited.actions[0].actions[0];
    expect(action.target).toMatchObject({ filter: { isSelfRef: true }, isSelf: true });
    expect(action.condition).toMatchObject({ kind: "selfHasTrait" });
    expect(action).toMatchObject({ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true });
  });
});
