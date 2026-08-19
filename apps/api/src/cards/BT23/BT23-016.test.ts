import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-016.js";

describe("BT23-016 Dokamon", () => {
  it("once per turn reacts only when this Digimon gets linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Eri Karan"], match: "name" }] }, count: 1 },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "permanentCount",
            op: "lte",
            value: 1,
            filter: { controllerDefault: "mine", kind: ["Tamer"] },
          },
          optional: true,
        },
      ],
    });
  });
});
