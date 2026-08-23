import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-012 KausGammamon", () => {
  it("has Evade while in the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "RB1-012", as: "kaus" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("kaus"), "Evade")).toBe(true);
  });

  it("does not grant Evade to a different Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "RB1-012", as: "kaus" },
          { card: "RB1-011", as: "other" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("other"), "Evade")).toBe(false);
  });
});
