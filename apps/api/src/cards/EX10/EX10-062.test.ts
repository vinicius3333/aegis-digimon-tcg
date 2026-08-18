import { describe, it, expect } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
// Boot side-effect: self-register every compiled-IR card module (so EX10-062's real IR loads).
import "../index.js";

/**
 * Full-engine A3 for EX10-062 Yujin Ozora's [All Turns] trash-link-card-trigger clause
 * (plan 08-02), consuming the Wave-1 (08-01) `whenLinkTrashed` SubTrigger event:
 *
 *   "[All Turns] When effects trash any of your Digimon's link cards, by suspending this
 *    Tamer, <Draw 1>."  (documented behavior EffectTiming.OnLinkCardDiscarded)
 *
 * KB authority (node tools/kb/query.mjs card EX10-062):
 *   Q5172: the effect does NOT trigger on a link-card REPLACE — the Wave-1 fire gate already
 *     excludes the replace path (only a genuine trash of a link card fires whenLinkTrashed).
 *
 * The card's continuous AllTurns SubTrigger watcher installs during recomputeContinuousEffects;
 * we then trash a real LINK card via the production `trash` primitive (the genuine producing
 * site) and assert the controller drew exactly 1 and the Tamer suspended.
 *
 * FAILS-WHEN-REVERTED: drop the SubTrigger consumer from EX10-062.ts (the `whenLinkTrashed`
 * action) — the watcher never installs, so the trash draws nothing and the Tamer stays
 * unsuspended => the draw + suspend assertions go RED. (Equivalently: removing the
 * fireSubTrigger at the trash seam, the 08-01 lever, also turns this RED.)
 */

function primitivesOf(s: { engine: unknown }): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("A3 EX10-062 — whenLinkTrashed consumer: suspend this Tamer to <Draw 1>", () => {
  it("trashing a friendly Digimon's link card suspends the Tamer and draws 1", async () => {
    // EX10-062 Yujin Ozora (a Tamer) on the controller's field — the watcher anchor + suspend cost.
    // A friendly Digimon (host) carries a LINK card (the genuine link-trash subject).
    // Deck cards so the <Draw 1> has something to draw.
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-062", as: "tamer" },
          { card: "BT1-009", as: "host", linked: [{ card: "BT1-009", as: "linkCard" }] },
        ],
        deck: ["BT1-009", "BT1-009"],
      },
    });
    const p0 = s.state.players[0]!;
    const tamer = s.perm("tamer");
    const host = s.perm("host");
    const linkCard = s.inst("linkCard");

    const handBefore = p0.hand.length;

    // Install EX10-062's continuous whenLinkTrashed watcher.
    await s.engine.recomputeContinuousEffects();

    // Trash the link card via the REAL production seam (fires whenLinkTrashed).
    await primitivesOf(s).trash([linkCard.instanceId]);
    await settle(() => p0.hand.length > handBefore);

    expect(host.linked.length).toBe(0); // the link card genuinely left the linked list
    // FAILS-WHEN-REVERTED: drop the whenLinkTrashed consumer => no draw, no suspend.
    expect(p0.hand.length).toBe(handBefore + 1); // exactly 1 drawn (the suspend-cost tail ran)
    expect(tamer.isSuspended).toBe(true); // the "by suspending this Tamer" cost was paid
  });

  it("trashing a NON-link card (a hand card) does not draw (replace/non-trash control, Q5172)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-062", as: "tamer" }],
        deck: ["BT1-009"],
        hand: [{ card: "BT1-009", as: "handCard" }],
      },
    });
    const p0 = s.state.players[0]!;
    const tamer = s.perm("tamer");
    const handCard = s.inst("handCard");

    const handBefore = p0.hand.length;
    await s.engine.recomputeContinuousEffects();

    await primitivesOf(s).trash([handCard.instanceId]);
    await settle(() => false, 30);

    // The hand card was trashed (hand shrinks), but no link-card trash => no whenLinkTrashed
    // fire => no draw and the Tamer stays unsuspended.
    expect(p0.hand.length).toBe(handBefore - 1);
    expect(tamer.isSuspended).toBe(false);
  });
});
