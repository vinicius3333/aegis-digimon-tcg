import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-057.js";

describe("EX7-057", () => {
  it("trashes 2 cards to delete one opposing Digimon with 7000 DP or less on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Trash", target: { count: 2 } }, { kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 7000 } } } }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toHaveLength(2);
  });
  it("has Dark Dragon as a rule trait and inherits Security Attack +1 with four or fewer hand cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", tokens: ["Dark Dragon"] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } }, while: { kind: "zoneCount", value: 4 } });
  });
});
