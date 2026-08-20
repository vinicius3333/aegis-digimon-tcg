import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-026.js";

describe("BT14-026", () => {
  it("has Blast Digivolve", () => expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }));
  it("trashes two opposing sources and returns a source-less opponent Digimon on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "TrashDigivolution", amount: 2 }, { kind: "Return", to: "hand", target: { filter: { digivolutionCards: "none" } } }] });
  });
});
