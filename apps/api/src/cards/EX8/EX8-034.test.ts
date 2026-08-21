import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-034.js";

describe("EX8-034", () => {
  it("plays an NSo Digimon costing 3 or less when digivolving and gives two opposing Digimon Security Attack -1 on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { count: 1, filter: { playCostLte: 3 } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -1 },
      target: { count: 2 },
    });
  });
  it("gives two opposing Digimon Security Attack -1 when deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-034", as: "mammoth" }] },
      1: {
        battleArea: [
          { card: "AD1-001", as: "one" },
          { card: "EX8-040", as: "two" },
        ],
      },
    });
    await advance(s.engine).verb.deletePermanent([s.perm("mammoth").permanentId]);
    await settle(
      () =>
        observe(s.engine).keywordAmount(s.perm("one"), "SecurityAttack") === -1 &&
        observe(s.engine).keywordAmount(s.perm("two"), "SecurityAttack") === -1,
    );
    expect(observe(s.engine).keywordAmount(s.perm("one"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("two"), "SecurityAttack")).toBe(-1);
  });
});
