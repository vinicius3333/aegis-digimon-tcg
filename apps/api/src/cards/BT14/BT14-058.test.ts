import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-058.js";

describe("BT14-058", () => {
  it("may grant own Digimon Rush on play or digivolution by placing Satsuki Tamahime underneath", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Rush" }, cost: { kind: "place", destination: "digivolutionStack", target: { filter: { nameOrTrait: [{ tokens: ["Satsuki Tamahime"], match: "name" }] } } } });
  });
  it("inherits Blocker", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" }));
});
