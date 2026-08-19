import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-058.js";

describe("BT22-058 Dreammon", () => {
  it("protects one own Digimon from opponent return effects after this card is linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Restrict",
              restriction: "returnToHandOrDeck",
              byOpponentEffectsOnly: true,
              duration: "untilOpponentTurnEnd",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    });
  });
});
