import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-021.js";

describe("EX7-021 Hexeblaumon", () => {
  it("has Ice Clad, trashes two evolution cards, and unsuspends if the opponent has no stacked Digimon", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("IceClad");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "TrashDigivolution", amount: 2, scope: "acrossDigimon", target: { filter: { controller: "opponent" } } }, { kind: "Unsuspend", condition: { kind: "opponentHasNone" } }]);
  });
  it("grants Piercing and Security Attack +1 to Ice-Snow while the opponent has no stacked Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions).toMatchObject([{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } }, target: { filter: { nameOrTrait: [{ tokens: ["Ice-Snow"] }] } } }, { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } } }]));
});
