import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-029.js";

describe("EX7-029", () => {
  it("has Blast Digivolve from hand and reduces two suspended opposing Digimon by 8000 DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({ keyword: "BlastDigivolve" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -8000, duration: "untilYourTurnEnd", target: { count: 2, filter: { suspended: true } } });
  });
  it("suspends an opposing Digimon and unsuspends itself when no opposing Digimon remain unsuspended", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions).toMatchObject([{ kind: "Suspend" }, { kind: "Unsuspend", condition: { kind: "opponentHasNone" } }]));
});
