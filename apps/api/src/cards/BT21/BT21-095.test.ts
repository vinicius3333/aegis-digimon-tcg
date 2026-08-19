import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-095.js";

describe("BT21-095 Wind Guardians", () => {
  it("keeps the face-up-security color waiver and security/Main branches faithful", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(staticEffect?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHaveNone" },
    });

    const securityAllTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(securityAllTurns).toMatchObject({ isSecurity: true });
    expect(securityAllTurns?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Vortex" },
      target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["WG"], match: "trait" }] } },
    });

    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions).toHaveLength(2);
    expect(main?.actions[0]).toMatchObject({ kind: "SecurityManipulation", op: "toHand", controller: "mine" });
    expect(main?.actions[1]).toMatchObject({ kind: "SecurityManipulation", op: "placeAsSecurity", faceUp: true });

    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      from: ["hand"],
      target: {
        filter: { levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["WG"], match: "trait" }] },
      },
    });
  });
});
