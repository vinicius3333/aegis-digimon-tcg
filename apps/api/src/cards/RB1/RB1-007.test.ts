import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./RB1-007.js";

describe("RB1-007 Greymon", () => {
  it("gains Security A. +1 with an exact [Agumon] digivolution card, not [Agumon Expert]", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "RB1-007", as: "exact", under: ["RB1-004"] },
          { card: "RB1-007", as: "expert", under: ["BT1-011"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("exact"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("expert"), "SecurityAttack")).toBe(0);
  });

  it("does not gain Security A. +1 on the opponent's turn", async () => {
    const s = setupEngine({
      1: { battleArea: [{ card: "RB1-007", as: "exact", under: ["RB1-004"] }] },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("exact"), "SecurityAttack")).toBe(0);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("RB1-007");
    const compiled = registeredCompiledCards.get("RB1-007") ?? getCompiledCard("RB1-007");
    expect(definition).toMatchObject({ cardId: "RB1-007", nameEn: "Greymon", level: 4, dp: 5000, playCost: 5 });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects).toHaveLength(1);
  });
});
