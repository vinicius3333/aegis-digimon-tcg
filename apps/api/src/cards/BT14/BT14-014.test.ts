import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-014.js";

describe("BT14-014", () => {
  it("has Blast Digivolve", () => expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }));
  it("deletes an opposing 6000 DP or lower Digimon on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { dp: { op: "lte", value: 6000 } } } });
  });
});
