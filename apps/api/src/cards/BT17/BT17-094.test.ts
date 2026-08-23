import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-094.js";

describe("BT17-094 Ancient Guardian Deity", () => {
  it("returns either a Hybrid or Ten Warriors Digimon from Trash", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
      target: {
        filter: {
          zone: "trash",
          nameOrTrait: [
            { tokens: ["Hybrid"], match: "trait" },
            { tokens: ["Ten Warriors"], match: "trait", orPrevious: true },
          ],
        },
      },
    });
  });

  it("plays a Ten Warriors Digimon or inherited-effect Tamer with four-cost reduction", () => {
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: true,
      costReduction: 4,
      optional: true,
      target: {
        filter: {
          orFilters: [
            { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ten Warriors"], match: "trait" }] },
            { kind: ["Tamer"], hasInheritedEffects: true },
          ],
        },
      },
    });
  });

  it("waives color requirements only while a Hybrid Tamer or Digimon is present", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] } },
        },
      ],
    });
  });
});
