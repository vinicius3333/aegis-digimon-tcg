import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle, findPermanent, assertNoLoudGap } from "./testkit/harness.js";
import { linkEligible } from "./effects/mindLink.js";
// Boot side-effect: self-registers every compiled-IR card module so the engine can
// resolve BT22-035's [On Play] Link effect by card id.
import "../cards/index.js";

/**
 * SYS-01 (Link half) — KB Q4881 (2025-07-04): "Can I use this card's [On Play]
 * [When Digivolving] effect to link a card that doesn't have <Link>? A: No, you can't."
 *
 * The Link interpreter path must gate target candidates through `linkEligible`, which
 * reads the STRUCTURED link prerequisite (CardDefinition.linkRequirement), NOT effectText
 * — a card carrying <Link> only in linkRequirement is invisible to text scanning.
 *
 * REVERT-CONFIRM-RED lever: remove the `.filter(...linkEligible...)` wire-up from
 * `runLink` in apps/api/src/engine/effects/interpreter.ts. The negative case below
 * (AD1-001 accepted as a link target) then goes RED — proving the guard, not the test
 * harness, is what rejects the no-<Link> card.
 */

describe("A3 Link — BT22-035 Entermon [On Play] gates link targets to <Link> cards (KB Q4881)", () => {
  it("links BT21-009 (has <Link>) and REJECTS AD1-001 (no <Link>) from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT22-035", as: "source" }, // Yellow/Black Lv.5, [On Play] Link 1 Lv.<=4
            // AD1-001 is pushed FIRST: without the guard it is the first candidate the count:1
            // Link would pick, so the "not.toContain(AD1-001)" assertion is the live
            // REVERT-CONFIRM-RED lever (it depends on the guard excluding it from the set).
            { card: "AD1-001", as: "ineligible" }, // Lv.4 Digimon WITHOUT <Link> -> rejected
            { card: "BT21-009", as: "linkable" }, // Lv.3 Digimon WITH <Link> -> eligible
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10; // afford the cost-8 hard play

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId }),
    ).toEqual({ ok: true });

    await settle(() => {
      const perm = player.battleArea.find((p) => p.topCard?.cardId === "BT22-035");
      return (perm?.linked.length ?? 0) > 0;
    });

    const entermon = findPermanent(s, 0, "BT22-035");
    const linkedIds = (entermon?.linked ?? []).map((c) => c.cardId);

    // Positive: the <Link>-carrying card landed in permanent.linked.
    expect(linkedIds).toContain("BT21-009");
    // Negative (REVERT-CONFIRM-RED lever): the no-<Link> card was never linked.
    expect(linkedIds).not.toContain("AD1-001");
    // AD1-001 stays in hand, never consumed by the link.
    expect(player.hand.some((c) => c.instanceId === s.inst("ineligible").instanceId)).toBe(true);

    assertNoLoudGap(s);
  });
});

describe("linkEligible(def) predicate", () => {
  it("returns true for a card carrying <Link> in linkRequirement", () => {
    const def = { cardId: "X", kinds: [], colors: [], evoCosts: [], dp: 0, level: 3, maxCountInDeck: 4, linkRequirement: "[Link] [Appmon] trait: Cost 1" };
    expect(linkEligible(def as never)).toBe(true);
  });
  it("returns false for a card with no link prerequisite", () => {
    const def = { cardId: "Y", kinds: [], colors: [], evoCosts: [], dp: 0, level: 4, maxCountInDeck: 4 };
    expect(linkEligible(def as never)).toBe(false);
  });
});
