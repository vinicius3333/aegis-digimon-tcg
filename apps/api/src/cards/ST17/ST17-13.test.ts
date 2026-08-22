import { describe, it, expect } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for ST17-13 (Magnamon) — [When Digivolving]:
//   "Trash the top digivolution card of 1 of your opponent's Digimon for each of that
//    Digimon's colors. Then, return 1 of your opponent's Digimon with no digivolution cards
//    to the hand."
//
// We drive the [When Digivolving] body directly via primitives.digivolveFromInstance, which
// fires the WhenDigivolving timing window for the digivolved card.
//
// FAILS-WHEN-REVERTED: without the WhenDigivolving body, the opponent's Digimon stack
// is untouched and the no-stack Digimon stays on the field.
//
// Card IDs used:
//   BT11-023 — Veemon (Lv.3, base for the digivolve)
//   ST17-13  — Magnamon (the card under test, placed in hand then digivolved)
//   AD1-004  — Red/Black Lv.6 Digimon (2 colors → 2 digi-cards trashable)
//   AD1-001  — Greymon (Red Lv.4, 1 color, no digi-stack → bounce target)

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("ST17-13 Magnamon [When Digivolving] — trash digi-cards per color, bounce no-stack Digimon", () => {
  it("trashes digi-cards equal to opponent Digimon's color count, bounces a no-stack Digimon", async () => {
    const s = setupEngine(
      {
        // Base Digimon (Veemon) on p0's battle area.
        0: { battleArea: [{ card: "BT11-023", dp: 3000, as: "veemon" }], hand: [{ card: "ST17-13", as: "magnamon" }] },
        1: {
          battleArea: [
            // Opponent Digimon with a 2-color top card (AD1-004 = Red+Black):
            // 3 digi-cards in stack → after 2 are trashed (one per color), 1 remains,
            // so this Digimon still has digi-cards and DOES NOT qualify for the bounce filter.
            {
              card: "AD1-004",
              dp: 8000,
              as: "oppDigimon",
              under: ["BT1-001", "BT1-002", "BT1-003"],
            },
            // A separate opponent Digimon with NO digi-stack (bounce target: AD1-001 = Red Lv.4).
            { card: "AD1-001", dp: 4000, as: "bounceTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const veemon = s.perm("veemon");
    const oppDigimon = s.perm("oppDigimon");
    const bounceTarget = s.perm("bounceTarget");
    const magnamonId = s.inst("magnamon").instanceId;

    const initialStack = oppDigimon.stack.length; // 3
    const initialOppBattleCount = p1.battleArea.length; // 2

    // Drive the digivolve directly via primitives (this fires WhenDigivolving).
    // payCost: false to skip memory checking in the test.
    await primitivesOf(s).digivolveFromInstance(veemon.permanentId, magnamonId, { payCost: false });

    // Wait for WhenDigivolving effects to resolve.
    // Both the trash and bounce happen in one async resolution; wait for BOTH to complete.
    await settle(() => oppDigimon.stack.length < initialStack && p1.battleArea.length < initialOppBattleCount, 800);

    // The 2-color opponent Digimon should have lost at least 1 digi-card (ideally 2).
    expect(oppDigimon.stack.length).toBe(initialStack - 2);
    expect(p1.trash.filter((card) => ["BT1-002", "BT1-003"].includes(card.cardId))).toHaveLength(2);

    // The no-stack opponent Digimon should have been returned to p1's hand.
    expect(p1.battleArea.some((p) => p.permanentId === bounceTarget.permanentId)).toBe(false);
    expect(p1.hand.some((c) => c.cardId === "AD1-001")).toBe(true);
  });

  it("trashes exactly one top digi-card from a one-color target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-023", as: "veemon" }], hand: [{ card: "ST17-13", as: "magnamon" }] },
        1: {
          battleArea: [{ card: "AD1-001", as: "oneColor", under: ["BT1-001", "BT1-002"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const target = s.perm("oneColor");
    const before = target.stack.length;

    await primitivesOf(s).digivolveFromInstance(s.perm("veemon").permanentId, s.inst("magnamon").instanceId, {
      payCost: false,
    });
    await settle(() => target.stack.length < before);

    expect(target.stack).toHaveLength(before - 1);
  });
});

describe("ST17-13 Magnamon [Security] — end of security battle digivolution", () => {
  it("allows a legal own Digimon to digivolve into the checked card without paying memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST8-09", as: "attacker", dp: 12000 }] },
        1: {
          battleArea: [{ card: "BT11-023", as: "veemon" }],
          security: [{ card: "ST17-13", as: "magnamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("veemon").topCard.cardId === "ST17-13", 3000);
    expect(s.perm("veemon").topCard.cardId).toBe("ST17-13");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT11-023")).toBe(false);
  });

  it("does not substitute an unrelated matching Magnamon from trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST8-09", as: "attacker", dp: 12000 }] },
        1: {
          battleArea: [{ card: "BT11-023", as: "veemon" }],
          security: [{ card: "ST17-13", as: "checked" }],
          trash: [{ card: "ST17-13", as: "unrelated" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });

    await settle(() => s.perm("veemon").topCard.cardId === "ST17-13", 3000);
    expect(s.perm("veemon").topCard.instanceId).toBe(s.inst("checked").instanceId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("unrelated").instanceId)).toBe(true);
  });

  it("de-digivolves the attacking Digimon before the security battle continues", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST8-09", as: "attacker", dp: 12000, under: ["BT1-001"] }] },
        1: { security: [{ card: "ST17-13", as: "magnamon" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });

    await settle(() => s.perm("attacker").stack.length === 0, 3000);
    expect(s.perm("attacker").stack).toHaveLength(0);
  });
});
