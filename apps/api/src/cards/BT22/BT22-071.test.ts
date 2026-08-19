import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-071.js";

describe("BT22-071 Devimon", () => {
  it("plays exactly one Jimmy KEN from hand only with one or fewer Tamers", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      payCost: false,
      target: {
        filter: { controller: "mine", nameOrTrait: [{ tokens: ["Jimmy KEN"], match: "name" }] },
        count: 1,
      },
      condition: {
        kind: "permanentCount",
        filter: { controller: "mine", kind: ["Tamer"] },
        op: "lte",
        value: 1,
      },
    });
  });

  it("returns one Flame or CS Digimon from trash as inherited optional effect", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "Return",
          to: "hand",
          optional: true,
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Flame", "CS"], match: "trait" }],
            },
            count: 1,
          },
        },
      ],
    });
  });
});
