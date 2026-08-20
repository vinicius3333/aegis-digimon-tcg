import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-009.js";

describe("EX5-009 Indramon", () => {
  it("draws and optionally plays a unique Deva into breeding on play", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "Draw", amount: 1 });
    expect(actions?.[1]).toMatchObject({ kind: "PlayWithoutCost", breeding: true, notSameNameAs: ["battleArea", "trash"], from: ["hand"] });
  });
  it("gains Security Attack plus one while it has Four Sovereigns or God Beast", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } }, while: { kind: "selfHasTrait" } });
  });
});
