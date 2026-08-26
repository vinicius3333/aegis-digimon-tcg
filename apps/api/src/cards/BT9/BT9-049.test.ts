import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT9-049.js";

describe("BT9-049 Kuwagamon (X Antibody)", () => {
  it("matches catalog, zero-cost Kuwagamon evolution, and trait-gated inherited Piercing IR", () => {
    expect(getCardDefinition("BT9-049")).toMatchObject({
      cardId: "BT9-049", nameEn: "Kuwagamon (X Antibody)", colors: ["Green"], kinds: ["Digimon"], level: 4,
      playCost: 5, dp: 6000, evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }], forms: ["Champion"],
      attributes: ["Virus"], types: ["Insectoid", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["Kuwagamon"], cost: 0, isAlternate: true }],
      effects: [{ trigger: "YourTurn", isInherited: true, actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } }, while: { kind: "selfHasTrait" } }] }],
    });
  });

  it("grants Piercing only while its host has the Insectoid trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT9-052", as: "insectoid", under: ["BT9-049"] },
          { card: "BT1-028", as: "other", under: ["BT9-049"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("insectoid"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("other"))).toBe(false);
  });
});
