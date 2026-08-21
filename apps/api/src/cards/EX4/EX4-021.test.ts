import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for EX4-021 (DexDorugoramon) — [DigiXros -2]: "Blue MetalGreymon" + "DarkKnightmon".
// "When you would play this card, you may place specified cards from your hand/battle area under
// it. Each placed card reduces the play cost." (documented behavior; reduceCostPerCard = 2.)
//
const EX4_021 = "EX4-021"; // played card, cost 12
const BLUE_METALGREYMON = "BT10-024"; // "MetalGreymon", Blue L5
const DARKKNIGHTMON = "BT10-066"; // "DarkKnightmon", Black L5

describe("EX4-021 [DigiXros -2] play by placing Blue MetalGreymon + DarkKnightmon", () => {
  it("plays at cost 8 (12 - 2×2) with both materials placed under it", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: EX4_021, as: "dx" },
            { card: BLUE_METALGREYMON, as: "mg" },
            { card: DARKKNIGHTMON, as: "dk" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;

    const dx = s.inst("dx");
    const mg = s.inst("mg");
    const dk = s.inst("dk");
    s.state.memory = 8; // exactly the reduced cost (12 - 4)

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: dx.instanceId,
      digiXros: { materialInstanceIds: [mg.instanceId, dk.instanceId] },
    });
    expect(res).toEqual({ ok: true });

    // Settle on the FULL resolution (both materials placed → all 3 cards have left the hand).
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === EX4_021) && p0.hand.length === 0);

    const perm = p0.battleArea.find((p) => p.topCard?.cardId === EX4_021);
    expect(perm).toBeDefined();
    // Both materials are now digivolution cards under DexDorugoramon, and left the hand.
    const stackIds = perm!.stack.map((c) => c.cardId);
    expect(stackIds).toContain(BLUE_METALGREYMON);
    expect(stackIds).toContain(DARKKNIGHTMON);
    expect(p0.hand.some((c) => c.instanceId === mg.instanceId)).toBe(false);
    expect(p0.hand.some((c) => c.instanceId === dk.instanceId)).toBe(false);
    // Cost: 8 paid from memory 8 → 0.
    expect(s.state.memory).toBe(0);
  });

  it("rejects a material that satisfies no recipe slot", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: EX4_021, as: "dx" },
          { card: "AD1-001", as: "greymon" }, // "Greymon" — matches neither MetalGreymon nor DarkKnightmon
        ],
      },
    });
    const dx = s.inst("dx");
    const greymon = s.inst("greymon");
    s.state.memory = 10;
    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: dx.instanceId,
      digiXros: { materialInstanceIds: [greymon.instanceId] },
    });
    expect(res.ok).toBe(false);
  });
});
