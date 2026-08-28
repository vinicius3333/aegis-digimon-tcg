import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-077.js";

describe("BT9-077 Matadormon", () => {
  it("matches catalog and Q1871 cost-only trash evolution IR", () => {
    expect(getCardDefinition("BT9-077")).toMatchObject({
      cardId: "BT9-077", nameEn: "Matadormon", colors: ["Purple"], kinds: ["Digimon"], level: 5,
      playCost: 7, dp: 7000, evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }], forms: ["Ultimate"],
      attributes: ["Virus"], types: ["Undead"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "WhenAttacking", actions: [{ kind: "ModifyDP", amount: 3000, duration: "forTheTurn", optional: true, cost: { kind: "trash" } }] },
        { trigger: "YourTurn", actions: [{ kind: "Replacement", event: "wouldDigivolve", into: { zone: "trash" }, actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }] }] },
      ],
    });
  });

  it("may trash an Undead or Dark Animal card when attacking to get +3000 DP", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT9-077", as: "matadormon" }], hand: [{ card: "BT9-073", as: "cost" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("matadormon"));
    expect(s.perm("matadormon").currentDP).toBe(10000);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });
});
