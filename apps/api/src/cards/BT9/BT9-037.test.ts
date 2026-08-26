import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-037.js";

describe("BT9-037 Nefertimon", () => {
  it("matches catalog, Gatomon alternate evolution, Armor Purge, and attack DP IR", () => {
    expect(getCardDefinition("BT9-037")).toMatchObject({
      cardId: "BT9-037", nameEn: "Nefertimon", colors: ["Yellow"], kinds: ["Digimon"], level: 4,
      playCost: 5, dp: 5000, evoCosts: [{ color: "Yellow", level: 3, memoryCost: 3 }], forms: ["ArmorForm"],
      attributes: ["Free"], types: ["Holy Beast"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["Gatomon"], cost: 0, isAlternate: true }],
      effects: [
        { trigger: "Static", keywords: [{ keyword: "Armor Purge" }] },
        { trigger: "WhenAttacking", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }] },
      ],
    });
  });

  it("gives an opposing Digimon -2000 DP when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-037", as: "nefertimon" }] },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("nefertimon"));
    expect(s.perm("target").currentDP).toBe(1000);
  });
});
