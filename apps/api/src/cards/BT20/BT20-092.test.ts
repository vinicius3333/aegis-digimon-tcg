import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-092.js";

describe("BT20-092 Battle NPC", () => {
  it("places a level 3 Digimon under itself before drawing", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [{
        kind: "Draw",
        amount: 1,
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          position: "bottom",
          host: "self",
          target: { from: ["hand"], filter: { kind: ["Digimon"], levels: [3] } },
        },
        abortOnDecline: true,
      }],
    });
  });

  it("requires having no Digimon before offering the under-Tamer play", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({
      condition: { kind: "youHaveNone", filter: { kind: ["Digimon"] } },
      actions: [
        { kind: "PlayWithoutCost", from: ["underThisTamer"], payCost: false, abortOnDecline: true },
        { kind: "Delete", target: { isSelf: true } },
      ],
    });
  });
});
