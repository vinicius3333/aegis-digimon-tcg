import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT24-093 (Aegiochusmon: Cerulean) — proves the [Main] on-play body ("Add your top
// security card to the hand and <Recovery +1 (Deck)>. Then, place this card in the battle
// area.") actually resolves when the card is PLAYED.
//
// Lane R4's dead-clause class: the module used to register this clause exclusively at
// EffectTiming.OnDeclaration, a window `applyPlayCard` never fires for an Option
// (`playCard.ts` only auto-fires `EffectTiming.OnUseOption`). Playing the card sent it
// straight to the trash with no security-to-hand, no recovery, and no battle-area
// placement. The fix re-homes the clause to `EffectTiming.OnUseOption`.
//
// FAILS-WHEN-REVERTED: with the clause back at OnDeclaration only, this playCard call
// leaves the security stack, hand, and deck untouched, and the card lands in the trash
// instead of the battle area (test RED).

describe("BT24-093 [Main] on-play body fires on a real playCard (not dead)", () => {
  it("moves the top security card to hand, recovers 1 from deck to security, and lands in the battle area", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT1-045", dp: 3000 }], // §4-21 color-requirement source (Yellow)
          hand: [{ card: "BT24-093", as: "option" }],
          security: [{ card: "AD1-001", as: "topSecurity" }],
          deck: [{ card: "AD1-001", as: "deckCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;

    const option = s.inst("option");
    const topSecurity = s.inst("topSecurity");
    const deckCard = s.inst("deckCard");
    s.state.memory = 0; // maxAffordable for seat 0 (turnSeat) is memory + 10, covers cost 2

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId }),
    ).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "BT24-093"));
    await settle(() => false, 60); // flush the rest of the resolution

    // NEGATIVE CONTROL: a reverted (OnDeclaration-only) module leaves security, hand, and
    // deck completely unchanged by this playCard call, and the card sits in the trash.
    expect(p0.hand.some((c) => c.instanceId === topSecurity.instanceId)).toBe(true); // top security -> hand
    expect(p0.security.some((c) => c.instanceId === topSecurity.instanceId)).toBe(false);
    expect(p0.security.length).toBe(1); // Recovery +1 refilled security from the deck
    expect(p0.deck.some((c) => c.instanceId === deckCard.instanceId)).toBe(false);
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "BT24-093")).toBe(true); // placed
    expect(p0.trash.some((c) => c.cardId === "BT24-093")).toBe(false); // NOT trashed
  });
});
