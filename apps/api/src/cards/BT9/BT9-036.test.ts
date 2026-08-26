import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-036.js";

describe("BT9-036 Gatomon (X Antibody)", () => {
  it("matches catalog, zero-cost Gatomon evolution, and inherited threshold IR", () => {
    expect(getCardDefinition("BT9-036")).toMatchObject({
      cardId: "BT9-036", nameEn: "Gatomon (X Antibody)", colors: ["Yellow"], kinds: ["Digimon"], level: 4,
      playCost: 4, dp: 5000, evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }], forms: ["Champion"],
      attributes: ["Vaccine"], types: ["Holy Beast", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["Gatomon"], cost: 0, isAlternate: true }],
      effects: [{ trigger: "WhenAttacking", isInherited: true, actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn", condition: { kind: "securityAtLeast", value: 3 } }] }],
    });
  });

  it("gives an opponent -2000 DP when its host attacks with at least 3 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-037", as: "host", under: ["BT9-036"] }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").currentDP).toBe(1000);
  });
});
