import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT16-100 (Thunderflame Crusher) — Option card:
//   [Main] Delete 1 of your opponent's level 5 or lower Digimon.
//   Then, if you have 2 or fewer security cards, place this card at the BOTTOM
//   of your security stack.
//
// FAILS-WHEN-REVERTED: the self-to-security placement fires when security ≤ 2.
// Without the hand-written module, the IR stub (RawUnparsed) would leave the card
// in trash and NOT place it in security. The test checks the card ends up in security.

const OPTION_CARD = "BT16-100"; // Purple/Yellow Option, playCost 6
const OPP_DIGIMON = "AD1-001"; // "Greymon", Lv.4 Digimon — valid ≤5 deletion target

// §9-1-4 fix (Aegis engine): a used Option no longer resolves against a pre-trashed
// stand-in, so this test's chain (delete -> continuous recompute -> conditional
// self-to-security) now runs to genuine completion instead of the predicate already
// being trivially satisfied. 600 ticks was tuned against the old shortcut and is no
// longer enough headroom for the real chain; widened budget, same "resolve on the
// FINAL state" predicates below.
async function settle(predicate: () => boolean, maxTicks = 3000): Promise<void> {
  for (let i = 0; i < maxTicks && !predicate(); i++) await Promise.resolve();
}

describe("BT16-100 Thunderflame Crusher — [Main] delete + self-to-security", () => {
  it("when security ≤ 2, the option card is placed at the BOTTOM of security (not trash)", async () => {
    const s = setupEngine({
      0: {
        // §4-21 color-requirement source (Purple + Yellow)
        battleArea: [{ card: "BT10-079", dp: 3000 }, { card: "BT1-045", dp: 3000 }],
        hand: [{ card: OPTION_CARD, as: "optCard" }],
        // Owner has exactly 1 security card (≤ 2 threshold met).
        security: ["AD1-010"], // Garurumon Lv.4
      },
      1: {
        // Opponent has 1 Lv.4 Digimon in battle area (valid ≤5 deletion target).
        battleArea: [{ card: OPP_DIGIMON, as: "oppDigimon", dp: 5000 }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const oppTopId = s.perm("oppDigimon").topCard!.instanceId;
    const optCardId = s.inst("optCard").instanceId;
    expect(p0.security).toHaveLength(1);

    s.state.memory = 6; // enough memory for the option's cost 6

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: optCardId,
    });
    expect(res.ok).toBe(true);

    // Wait for the option to leave hand.
    await settle(() => !p0.hand.some((c) => c.instanceId === optCardId), 3000);

    // Wait for the opponent's Digimon to be deleted.
    await settle(() => !p1.battleArea.some((perm) => perm.topCard?.instanceId === oppTopId), 3000);

    // Wait further for the security placement to complete (addSecurity fires async after deletion).
    // §9-1-4: the card sits on the transient `resolvingOption` slot (neither security nor
    // trash) for the whole window between activation and resolution, so "not in trash yet"
    // no longer implies "already resolved" — wait for it to land in an actual zone instead.
    await settle(() => {
      const inSec = p0.security.some((c) => c.instanceId === optCardId);
      const inTrash = p0.trash.some((c) => c.instanceId === optCardId);
      return inSec || inTrash;
    }, 3000);

    // The opponent's Digimon should have been deleted.
    const oppStillThere = p1.battleArea.some((perm) => perm.topCard?.instanceId === oppTopId);
    expect(oppStillThere).toBe(false);

    // The option card should be in owner's security (not trash).
    const inSecurity = p0.security.some((c) => c.instanceId === optCardId);
    const inTrash = p0.trash.some((c) => c.instanceId === optCardId);
    expect(inSecurity).toBe(true);
    expect(inTrash).toBe(false);
  });

  it("when security > 2, the option card goes to trash (not security)", async () => {
    const s = setupEngine({
      0: {
        // §4-21 color-requirement source (Purple + Yellow)
        battleArea: [{ card: "BT10-079", dp: 3000 }, { card: "BT1-045", dp: 3000 }],
        hand: [{ card: OPTION_CARD, as: "optCard" }],
        // Owner has 3 security cards (> 2 → card should NOT go to security).
        security: ["AD1-010", "AD1-010", "AD1-010"],
      },
      1: {
        // Opponent has a Lv.4 Digimon.
        battleArea: [{ card: OPP_DIGIMON, as: "oppDigimon", dp: 5000 }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const oppTopId = s.perm("oppDigimon").topCard!.instanceId;
    const optCardId = s.inst("optCard").instanceId;
    expect(p0.security).toHaveLength(3);

    s.state.memory = 6;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: optCardId,
    });
    expect(res.ok).toBe(true);

    await settle(() => !p0.hand.some((c) => c.instanceId === optCardId), 3000);

    await settle(() => !p1.battleArea.some((perm) => perm.topCard?.instanceId === oppTopId), 3000);

    // The option card should be in trash, not security.
    const inSecurity = p0.security.some((c) => c.instanceId === optCardId);
    expect(inSecurity).toBe(false);
  });
});
