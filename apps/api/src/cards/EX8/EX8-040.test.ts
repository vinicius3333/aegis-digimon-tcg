import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-040.js";

describe("EX8-040", () => {
  it("may suspend one Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Suspend", optional: true, target: { count: 1 } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Suspend", optional: true, target: { count: 1 } });
  });
  it("inherits +2000 DP during your turn", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, duration: "permanent" }));
});
