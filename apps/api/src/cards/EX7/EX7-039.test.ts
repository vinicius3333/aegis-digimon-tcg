import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-039.js";

describe("EX7-039", () => {
  it("draws one and optionally gains 1 memory by trashing a Rock Dragon or Earth Dragon from hand", () => expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([{ kind: "Draw", amount: 1, cost: { kind: "trash" } }, { kind: "GainMemory", amount: 1, optional: true }]));
  it("has Machine Dragon as a rule trait and inherits +2000 DP during the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", tokens: ["Machine Dragon"] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, duration: "permanent" });
  });
});
