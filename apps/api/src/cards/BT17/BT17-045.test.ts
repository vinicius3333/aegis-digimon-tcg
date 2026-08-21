import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-045.js";

describe("BT17-045 Argomon", () => {
  it("may play Rhythm from hand when no Rhythm is in play after digivolving", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Rhythm"], match: "name" }] }, count: 1 }, condition: { kind: "youHaveNone", filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Rhythm"], match: "name" }] } } });
  });

  it("gains one memory on deletion as an inherited effect", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "GainMemory", amount: 1 }] });
  });
});
