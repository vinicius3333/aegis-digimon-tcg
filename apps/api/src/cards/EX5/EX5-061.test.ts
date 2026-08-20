import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-061.js";

describe("EX5-061 Cerberusmon", () => {
  it("plays a purple level 3 Digimon from trash without cost on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, target: { filter: { controller: "mine", colors: ["Purple"], levels: [3] } } });
  });
  it("draws, trashes, and reactivates On Play when Cerberusmon or X Antibody is in the stack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "Trash" }, { kind: "ReactivateEffect", fromTrigger: "OnPlay", count: 1, condition: { kind: "selfDigivolutionStackHasTrait" } }]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Unsuspend", optional: true, cost: { kind: "deleteOwn" } }] });
  });
});
