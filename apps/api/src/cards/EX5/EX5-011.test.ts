import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-011.js";

describe("EX5-011 Pajiramon", () => {
  it("draws and plays a unique Deva into breeding on play", () => {
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
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Tamer"] } },
    });
  });
  it("gains Security Attack plus one with Four Sovereigns or God Beast", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
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
