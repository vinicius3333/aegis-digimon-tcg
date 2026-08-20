import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-062.js";

describe("EX6-062 Mastemon", () => {
  it("has Partition and during DNA digivolving places up to two level 6 cards from trash under itself", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Partition");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlaceUnder", condition: { kind: "isDnaDigivolving" }, target: { count: 2, upTo: true, from: ["trash"] } });
  });
  it("returns an opposing Digimon for each level 6 stack card and grants Security Attack +3/Piercing at four", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions).toMatchObject([{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 3 } }, while: { kind: "selfDigivolutionStackCountAtLeast", count: 4 } }, { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } } }]));
});
