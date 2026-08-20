import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-081.js";

describe("BT14-081", () => {
  it("plays a Dark Animal or SoC Digimon from trash on digivolution, with two copies if Eiji is underneath", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], payCost: false, target: { filter: { levelComparison: { op: "lte", value: 4 } }, countModifier: { amount: 2, condition: { kind: "selfDigivolutionStackHasTrait" } } } }));
  it("once per turn unsuspends by deleting an opposing low-level Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Unsuspend", cost: { kind: "delete" } }] }));
});
