import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-050.js";

describe("EX5-050 Sinduramon", () => {
  it("has Decoy for Deva/Four Sovereigns and draws then plays a unique Deva into breeding", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([{ keyword: "Decoy" }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "PlayWithoutCost", breeding: true, notSameNameAs: ["battleArea", "trash"] }]);
  });
  it("inherits Blocker while it has Four Sovereigns or God Beast", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0]).toMatchObject({ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } }, while: { kind: "selfHasTrait" } });
  });
});
