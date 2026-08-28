import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-027.js";

describe("EX6-027 Ophanimon", () => {
  it("has Blast Digivolve and gates an -8000 DP effect behind trashing security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDigivolve",
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -8000,
      duration: "untilOpponentTurnEnd",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "security" } } },
    });
  });
  it("responds to security removal with attack/recovery effects depending on whose turn it is", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
        { kind: "Attack" },
        { kind: "GainKeyword", keyword: { keyword: "Recovery", amount: 1 } },
      ],
    }));
});
