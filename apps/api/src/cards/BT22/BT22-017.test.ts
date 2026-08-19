import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-017.js";

describe("BT22-017 Gabumon", () => {
  it("reveals Omnimon text and CS, and requires two field Digimon for inherited DNA digivolution", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3 })],
      }),
    );
    const inherited = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(inherited).toMatchObject({ isInherited: true });
    expect(inherited?.actions[0]).toMatchObject({
      kind: "DnaDigivolve",
      materials: [
        { filter: { isSelfRef: true }, count: 1, isSelf: true, zone: "battleArea" },
        { filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true }, count: 1, zone: "battleArea" },
      ],
      into: { controllerDefault: "mine", kind: ["Digimon"], zone: "hand", hasDnaDigivolutionRequirement: true },
      optional: true,
    });
  });
});
