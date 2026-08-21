import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-010.js";

describe("EX5-010 Sandiramon", () => {
  it("draws and optionally plays a unique Deva into breeding on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      {
        kind: "PlayWithoutCost",
        breeding: true,
        optional: true,
        notSameNameAs: ["battleArea", "trash"],
        from: ["hand"],
      },
    ]);
  });
  it("deletes an opposing Digimon at 5000 DP or less on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } } },
    });
  });
  it("grants Security Attack plus one to the inherited Digimon with the qualifying trait", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "Aura",
      target: { filter: { isSelfRef: true }, isSelf: true },
      effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
      while: {
        kind: "selfHasTrait",
        filter: { nameOrTrait: [{ match: "trait", tokens: ["Four Sovereigns", "God Beast"] }] },
      },
    });
  });
});
