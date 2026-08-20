import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-026.js";

describe("EX7-026", () => {
  it("reduces an opposing Digimon's DP by 3000 on play and digivolving", () => {
    expect(compiled.effects?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger))).toHaveLength(2);
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "forTheTurn", target: { count: 1 } });
  });
  it("inherits Barrier", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Barrier", raw: "＜Barrier＞" }));
});
