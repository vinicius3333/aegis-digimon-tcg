import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT17-028 (AncientGarurumon):
//   [On Play] Return 1 of your opponent's Digimon with the lowest level to their hand.
//   [On Deletion] You may return 1 Tamer + 1 [Hybrid] Digimon from trash to hand.
//     Then, may play 1 Tamer from hand without cost (KB Q2776: even if nothing returned).
//
// FAILS-WHEN-REVERTED: [On Play] returns the lowest-level opponent Digimon.
// The declarative effect record encoded this correctly, but the [On Deletion] Tamer-play was
// listed as residual. This test proves the [On Play] bounce fires.

const ANCIENTGARURUMON = "BT17-028";
// AD1-001 is Greymon (Lv.4 Red Digimon) — a valid non-DigiEgg target for the bounce.
const OPP_DIGIMON = "AD1-001";

describe("BT17-028 AncientGarurumon — [On Play] return lowest-level opponent Digimon", () => {
  it("[On Play] returns lowest-level opponent Digimon to hand", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: ANCIENTGARURUMON, as: "ancientCard" }] },
        1: { battleArea: [{ card: OPP_DIGIMON, as: "oppDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;

    const targetTopCardId = s.perm("oppDigimon").topCard!.instanceId;
    const ancientCardId = s.inst("ancientCard").instanceId;

    // AncientGarurumon needs a permanent to play onto (digivolve base).
    // We play it directly as a new permanent from hand.
    s.state.memory = 12; // BT17-028 playCost = 12

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: ancientCardId,
    });
    expect(res.ok).toBe(true);

    // Wait for AncientGarurumon to leave hand and for the On Play effect to bounce the opponent.
    await settle(
      () => {
        const inHand = (s.state.players[0] as PlayerState).hand.some((c) => c.instanceId === ancientCardId);
        const oppBounced = !p1.battleArea.some((perm) => perm.topCard?.instanceId === targetTopCardId);
        return !inHand && oppBounced;
      },
      800,
    );

    // The opponent's Digimon should have been returned to their hand.
    const inOppBattleArea = p1.battleArea.some((perm) => perm.topCard?.instanceId === targetTopCardId);
    const inOppHand = p1.hand.some((c) => c.instanceId === targetTopCardId);
    expect(inOppBattleArea).toBe(false);
    expect(inOppHand).toBe(true);
  });
});
