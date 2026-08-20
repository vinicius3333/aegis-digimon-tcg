import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-068.js";

describe("EX8-068", () => {
  it("waives its color requirement with no face-up security cards and protects DS Digimon from battle deletion at 1 or more memory", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", condition: { kind: "youHaveNone", filter: { faceUp: true } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Aura", effect: { kind: "restriction", restriction: "beDeletedInBattle" }, while: { kind: "memoryAtLeast", value: 1 } });
  });
  it("takes the bottom security card to hand and places itself face-up at the bottom, and plays a DS Digimon from hand in security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([{ kind: "SecurityManipulation", op: "toHand", toTop: false }, { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true });
  });
});
