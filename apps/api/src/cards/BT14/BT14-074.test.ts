import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-074.js";

describe("BT14-074", () => {
  it("draws one by trashing a hand card when attacking and gains memory if Eiji is underneath", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ actions: [{ kind: "Draw", amount: 1, cost: { kind: "trash" } }, { kind: "GainMemory", amount: 1, condition: { kind: "selfDigivolutionStackHasTrait" } }] }));
  it("inherits once-per-turn memory when a Dark Animal or SoC Digimon is played", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }] }));
});
