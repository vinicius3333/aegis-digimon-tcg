import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-022.js";

describe("EX6-022 Mirei Mikagura", () => {
  it("has Barrier and reduces one opposing Digimon's Security Attack when Mirei is present", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Barrier");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -2 }, condition: { kind: "youHave" } });
  });
  it("plays Mirei from hand only when none is already present and inherits Alliance conditionally", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, condition: { kind: "youHaveNone" } });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Alliance" } }, while: { kind: "selfHasTrait" } }] });
  });
});
