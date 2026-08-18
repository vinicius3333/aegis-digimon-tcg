import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT24-044 (Muchomon) — its [On Play] Suspend-target filter read `Permanent.suspended`.
// `Permanent` has no `suspended` field (the real field is `isSuspended`), so `!p.suspended`
// evaluated `!undefined` -> always `true`: an ALREADY-suspended Digimon was silently offered
// as a legal "Suspend" target alongside genuinely-unsuspended ones, instead of being filtered
// out.
//
// FAILS-WHEN-REVERTED: reverting `!p.isSuspended` back to `!p.suspended` puts the
// already-suspended opponent Digimon back into the target-prompt's candidate list.

describe("BT24-044 [On Play] Suspend-target pool excludes already-suspended Digimon", () => {
  it("omits an already-suspended Lv<=6 Digimon from the target prompt (Permanent.suspended does not exist; real field is isSuspended)", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT1-009", dp: 3000, as: "healthy" }], // Lv3, NOT suspended -- always a legal target
          hand: [{ card: "BT24-044", as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "victim", suspended: true }] }, // Lv3, ALREADY suspended -- must be excluded
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const healthy = s.perm("healthy");
    const victim = s.perm("victim");
    const source = s.inst("source");
    s.state.memory = 10; // affords the cost-3 play

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });

    await settle(() => s.decisions.some((d) => d.req.kind === "chooseTargets"), 200);

    const targetPrompt = s.decisions.find((d) => d.req.kind === "chooseTargets");
    expect(targetPrompt).toBeDefined();
    const candidates = targetPrompt!.req.options?.candidateInstanceIds ?? [];
    expect(candidates).not.toContain(victim.permanentId); // already-suspended: not a legal target
    expect(candidates).toContain(healthy.permanentId); // unsuspended: still a legal target
  });
});

// §fx.reveal only flips cards face-up in place; it never moves them. The [On Play]
// reveal branch (reached only when the suspend target is the player's own Digimon) must
// follow it with an actual `ctx.fx.returnToHand` call for the selected [Shoto Kazama]/
// [Avian]/[Bird]/[Vortex Warriors] cards, or they silently stay in the deck.
describe("BT24-044 [On Play] adds the [Shoto Kazama] and matching-trait cards from the reveal to hand", () => {
  it("moves the matching cards to hand and the rest to the bottom of the deck", async () => {
    const s = setup(
      {
        0: {
          // Own Digimon to suspend, so the "If this effect suspended your Digimon"
          // reveal branch is reached.
          battleArea: [{ card: "BT1-009", dp: 3000, as: "own" }],
          deck: [
            { card: "BT20-085", as: "shoto" }, // [Shoto Kazama]
            { card: "BT1-013", as: "avian" }, // [Avian] trait
            { card: "AD1-001", as: "filler" }, // neither
          ],
          hand: [{ card: "BT24-044", as: "source" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    const p0 = s.state.players[0] as PlayerState;
    const shoto = s.inst("shoto");
    const avian = s.inst("avian");
    const filler = s.inst("filler");
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "BT24-044"));
    await settle(() => false, 60);

    expect(s.events.some((e) => e.kind === "actionRejected")).toBe(false);
    // Both matching cards land in hand — the reveal alone never moves them.
    expect(p0.hand.some((c) => c.instanceId === shoto.instanceId)).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === avian.instanceId)).toBe(true);
    // The non-matching filler card goes to the bottom of the deck, not the hand.
    expect(p0.hand.some((c) => c.instanceId === filler.instanceId)).toBe(false);
    expect(p0.deck.some((c) => c.instanceId === filler.instanceId)).toBe(true);
  });
});
