import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-010.js";

describe("P-010 Greymon", () => {
  it("gains Security Attack +1 with exact Agumon, not Agumon Expert", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-010", as: "exact", under: ["P-009"] },
          { card: "P-010", as: "expert", under: ["BT1-011"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("exact"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("expert"), "SecurityAttack")).toBe(0);
  });
});
