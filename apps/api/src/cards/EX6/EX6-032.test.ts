import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-032.js";

describe("EX6-032 Terriermon", () => {
  it("suspends one Digimon on play and inherits once-per-turn -2000 DP on attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Suspend", optional: true, target: { count: 1 } });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }] });
  });
});
