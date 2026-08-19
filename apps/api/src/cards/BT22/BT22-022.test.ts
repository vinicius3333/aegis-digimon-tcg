import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-022.js";

describe("BT22-022 Veedramon", () => {
  it("gates the Tamer play at one or fewer Tamers and limits inherited protection to opponent effects", () => {
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: { kind: "permanentCount", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
      target: {
        filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Veedramon"], match: "text" }] },
        count: 1,
      },
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(inherited).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({
      event: "wouldLeavePlay",
      leaveCause: "opponentEffect",
      sourceFilter: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }],
      },
    });
  });
});
