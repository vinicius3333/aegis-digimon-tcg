import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-071.js";

describe("EX8-071", () => {
  it("waives its color requirement with no face-up security cards and grants all NSo Digimon Scapegoat", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", condition: { kind: "youHaveNone", filter: { faceUp: true } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Scapegoat" }, target: { count: "all" }, duration: "permanent" });
  });
  it("takes the bottom security card to hand, places itself face-up at the bottom, and plays an NSo Digimon from hand in security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([{ kind: "SecurityManipulation", op: "toHand", position: "bottom" }, { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true });
  });
});
