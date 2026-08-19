import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-021.js";

describe("BT22-021 Shellmon", () => {
  it("supports Decode, bottom placement from hand on both triggers, and inherited Jamming", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.3 w/[Aqua]/[Sea Animal] in any trait)＞" }],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "PlaceUnder",
        target: {
          filter: { zone: "hand", controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
          from: ["hand"],
          count: 1,
        },
        underFilter: { controller: "mine", kind: ["Digimon"] },
        position: "bottom",
        optional: true,
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
      }),
    );
  });
});
