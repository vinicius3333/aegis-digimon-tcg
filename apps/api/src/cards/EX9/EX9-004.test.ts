import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-004.js";

describe("EX9-004", () => {
  it("inherits a once-per-turn memory gain by trashing its bottom face-down digivolution card when a Ver.4 Digimon is played", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1, optional: true, cost: { kind: "trash" } }] }] }));
});
