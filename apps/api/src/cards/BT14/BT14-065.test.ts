import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-065.js";

describe("BT14-065", () => {
  it("reveals three opponent cards and de-digivolves an opponent by one plus one per own Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "RevealAdd", controller: "opponent", revealCount: 3 }, { kind: "DeDigivolve", amount: 1, scaling: { unit: "cards", per: 1 } }] });
  });
});
