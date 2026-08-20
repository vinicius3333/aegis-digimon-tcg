import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-011.js";

describe("EX5-011 Pajiramon", () => {
  it("draws and plays a unique Deva into breeding on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "PlayWithoutCost", breeding: true, notSameNameAs: ["battleArea", "trash"] }]);
  });
  it("gains Security Attack plus one with Four Sovereigns or God Beast", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } }, while: { kind: "selfHasTrait" } });
  });
});
