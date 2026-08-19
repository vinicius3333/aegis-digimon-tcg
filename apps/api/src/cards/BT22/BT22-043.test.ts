import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-043.js";

describe("BT22-043 Terriermon", () => {
  it("watches self CS digivolution-card additions before playing a CS Tamer", () => {
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({ frequency: "OncePerTurn" });
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controllerDefault: "mine" },
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          target: { filter: { controller: "mine", trait: ["CS"], cardType: "Tamer" }, count: 1 },
          condition: {
            kind: "CountCondition",
            zone: "field",
            filter: { controller: "mine", cardType: "Tamer" },
            operator: "<=",
            value: 1,
          },
        },
      ],
    });
  });

  it("keeps the inherited top-to-bottom placement draw effect", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      cost: { kind: "place", target: { filter: { controllerDefault: "mine", kind: ["Digimon"] }, count: 1 } },
    });
  });
});
