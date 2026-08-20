import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-033.js";

describe("EX6-033 Wendigomon", () => {
  it("suspends one Digimon on play and digivolving and inherits attack DP reduction", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Suspend", optional: true });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Suspend", optional: true });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000 }] });
  });
});
