import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-037.js";

describe("BT14-037", () => {
  it("has Blast Digivolve and recovers one security when at five or fewer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "SecurityManipulation", op: "addTop", condition: { kind: "zoneCount", value: 5 } });
  });
  it("scales the opposing DP reduction with your security count", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({ kind: "ModifyDP", amount: -1000, scaling: { unit: "security", per: 1 } }));
});
