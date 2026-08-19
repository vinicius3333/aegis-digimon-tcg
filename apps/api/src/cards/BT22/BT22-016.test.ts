import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-016.js";

describe("BT22-016 Mcmon", () => {
  it("reveals Appmon and Entertainment/Awakening cards and has its link effect", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [
          expect.objectContaining({
            kind: "RevealAdd",
            revealCount: 3,
            add: expect.arrayContaining([
              expect.objectContaining({
                filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
                count: 1,
              }),
              expect.objectContaining({
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["Entertainment", "Awakening (App Name)"], match: "trait" }],
                },
                count: 1,
              }),
            ]),
          }),
        ],
      }),
    );
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({ frequency: "OncePerTurn" });
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      actions: [
        {
          kind: "TrashDigivolution",
          amount: 1,
          target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1 },
        },
      ],
    });
  });
});
