import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-036.js";

describe("BT22-036 Chaperomon", () => {
  it("keeps the Arisa trash-placement digivolution and Puppet Overclock/leave replacement", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ isFromHand: true, condition: { kind: "youHave" } });
    expect(main?.actions[0]).toMatchObject({
      kind: "DigivolveViaPlacement",
      placeCost: {
        kind: "placeFromTrash",
        position: "bottom",
        destination: "digivolutionStack",
        hostFilter: { nameOrTrait: [{ tokens: ["Shoemon"], match: "name" }] },
      },
      into: { isSelfRef: true },
      cost: 3,
      ignoreDigivolutionRequirements: true,
    });
    const endTurn = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(endTurn?.actions[0]).toMatchObject({
      kind: "Attack",
      attackPlayer: true,
      withoutSuspending: true,
      optional: true,
      cost: { kind: "deleteOwn" },
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(inherited).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          excludeOwnEffects: true,
          sourceFilter: { isSelfRef: true },
          cost: { kind: "deleteOwn" },
        },
      ],
    });
  });
});
