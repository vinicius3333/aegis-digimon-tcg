import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-069.js";

describe("EX8-069", () => {
  it("waives its color requirement with no face-up security cards and grants all NSp Digimon Alliance", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHaveNone", filter: { faceUp: true } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Alliance" },
      target: { count: "all" },
      duration: "permanent",
    });
  });
  it("takes the bottom security card to hand and places itself face-up at the bottom", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", toTop: false },
      { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true },
    ]));
  it("contains only the printed effects", () => expect(compiled.effects).toHaveLength(3));
});
