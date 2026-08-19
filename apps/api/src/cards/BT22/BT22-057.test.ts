import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-057.js";

describe("BT22-057 Kurisarimon", () => {
  it("limits the optional Arata Sanada play to one or fewer Tamers", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Arata Sanada"], match: "name" }] }, count: 1 },
      condition: { kind: "permanentCount", filter: { controller: "mine", kind: ["Tamer"] }, op: "lte", value: 1 },
    });
  });

  it("anchors the inherited Diaboromon leave prevention to this Digimon", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Prevent", mode: "leavePlay" }],
        },
      ],
    });
  });
});
