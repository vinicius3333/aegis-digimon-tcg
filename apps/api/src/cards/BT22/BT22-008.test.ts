import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-008.js";

describe("BT22-008 Agumon", () => {
  it("requires this Digimon plus another owned Digimon for the inherited End of Your Turn DNA digivolution", () => {
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
      target: { filter: { zone: "trash", controller: "mine" } },
    });

    const inherited = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(inherited).toMatchObject({ isInherited: true });
    const dna = inherited?.actions[0] as any;
    expect(dna).toMatchObject({ kind: "DnaDigivolve", payCost: true, optional: true });
    expect(dna.materials).toEqual([
      { filter: { isSelfRef: true }, count: 1, zone: "battleArea" },
      { filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true }, count: 1, zone: "battleArea" },
    ]);
    expect(dna.into).toEqual({
      filter: { controller: "mine", kind: ["Digimon"], zone: "hand", hasDnaDigivolutionRequirement: true },
      count: 1,
    });
  });
});
