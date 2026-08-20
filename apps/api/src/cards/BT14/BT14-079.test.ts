import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-079.js";

describe("BT14-079", () => {
  it("uses level 3 without Eiji and level 4 when Eiji is stacked", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, target: { filter: { levelComparison: { op: "lte", value: 3 } } }, condition: { kind: "not" } }, { kind: "PlayWithoutCost", from: ["trash"], payCost: false, target: { filter: { levelComparison: { op: "lte", value: 4 } } }, condition: { kind: "selfDigivolutionStackMatchesFilter" } }]));
  it("gains one memory by trashing a hand card when attacking", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1, cost: { kind: "trash" } }));
  it("inherits once-per-turn unsuspend when a Dark Animal or SoC Digimon is played", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Unsuspend" }] }] }));
});
