import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-066.js";

describe("BT17-066 HippoGryphonmon", () => {
  it("has Blocker and plays one level-3 purple or yellow Digimon from hand", () => {
    expect(compiled.effects.filter((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Blocker"))).toHaveLength(2);
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving" && !entry.isInherited);
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Yellow", "Purple"], levels: [3] }, count: 1 },
    });
  });
});
