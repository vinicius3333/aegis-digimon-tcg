import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { sharedCardNumber } from "@aegis/shared";
import { copies, validateMainDeckWith } from "./qaRulings1.testSupport.js";
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

describe("P-010 Greymon — KB Q&A rulings", () => {
  it("shares one 4-copy deck budget with RB1-007, which is always treated as card number P-010 (Q4079)", () => {
    expect(sharedCardNumber("RB1-007")).toBe("P-010");
    expect(validateMainDeckWith([...copies("P-010", 1), ...copies("RB1-007", 3)])).toEqual({ ok: true });
    expect(validateMainDeckWith([...copies("P-010", 4), ...copies("RB1-007", 1)])).toMatchObject({
      ok: false,
      reason: expect.stringContaining("shared card number"),
    });
  });

  it("gains no Security Attack from [Agumon Expert] or [ToyAgumon], only from exact [Agumon] (Q4115)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-010", as: "expert", under: ["BT1-011"] },
          { card: "P-010", as: "toy", under: ["BT7-007"] },
          { card: "P-010", as: "exact", under: ["BT1-010"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("expert"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("toy"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("exact"), "SecurityAttack")).toBe(1);
  });
});
