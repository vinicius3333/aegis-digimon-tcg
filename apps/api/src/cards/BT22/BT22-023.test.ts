import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-023.js";

describe("BT22-023 AeroVeedramon", () => {
  it("returns level-4-or-lower opponent Digimon, unsuspends a blue ally, and has the Veedramon inherited reaction", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Return",
        to: "deckBottom",
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
          count: 1,
        },
      });
    }
    const endTurn = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(endTurn).toMatchObject({ frequency: "OncePerTurn" });
    expect(endTurn?.actions[0]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      target: { filter: { controller: "mine", kind: ["Digimon", "Tamer"], colors: ["Blue"] }, count: 1 },
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(inherited).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true, nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }] },
      condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Blue"] } },
      actions: [{ kind: "Unsuspend", optional: true, target: { filter: { isSelfRef: true }, isSelf: true } }],
    });
  });
});
