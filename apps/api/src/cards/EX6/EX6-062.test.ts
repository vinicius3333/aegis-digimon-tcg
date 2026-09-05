import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-062.js";

describe("EX6-062 UltimateChaosmon", () => {
  it("has Partition and during DNA digivolving places up to two level 6 cards from trash under itself", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Partition");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      condition: { kind: "isDnaDigivolving" },
      target: { count: 2, upTo: true, from: ["trash"], filter: { levels: [6] } },
    });
  });
  it("mandatorily returns an opposing Digimon for each level 6 stack card and grants Security Attack +3/Piercing at four", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions).toMatchObject([
      {
        kind: "Aura",
        effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 3 } },
        while: { kind: "selfDigivolutionStackCountAtLeast", count: 4 },
      },
      { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } } },
    ]);
  });
  it("publicly exposes the threshold keywords with four level 6 stack cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX6-062", as: "chaos", under: ["EX6-056", "EX6-057", "EX6-058", "EX6-059"] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("chaos"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("chaos"))).toBe(true);
  });
});
