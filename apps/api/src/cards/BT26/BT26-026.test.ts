import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-026.js";

describe("BT26-026 Cougarmon", () => {
  it("models the printed evolution, Barrier, and alternate-cost choices", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Glowing Dawn"], cost: 2, isAlternate: true }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }),
      expect.objectContaining({ trigger: "Static", isInherited: true, keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }),
      expect.objectContaining({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [expect.objectContaining({
        kind: "Modal", choose: 1, options: expect.arrayContaining([
          [expect.objectContaining({ kind: "UseOptionWithoutCost", payCost: true, reduceCostBy: 2, cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" } })],
          [expect.objectContaining({ kind: "UseOptionWithoutCost", payCost: true, reduceCostBy: 2, cost: { kind: "trashSecurityTop", controller: "mine" } })],
        ]),
      })] }),
    ]));
  });

  it("publicly uses a Glowing Dawn Option after paying the security-top alternate cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-026", as: "cougarmon" }], hand: [{ card: "P-236", as: "option" }], security: ["BT1-001"] },
    }, { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true });
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("cougarmon"), { attackerPermanentId: s.perm("cougarmon").permanentId });
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
