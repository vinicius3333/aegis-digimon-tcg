import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import {
  makeInstance as instance,
  makeDigimon as digimon,
  setupEngine as setup,
  settle,
} from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT21-097 (App Link) — [Main]:
//   Reveal the top 3 cards of your deck. Add 1 card with the [Appmon]/[App Driver] trait
//   among them to the hand. Trash the rest. Then, place this card in the battle area.
//
// FAILS-WHEN-REVERTED: `ctx.fx.reveal` only flips cards face-up in place — it does not
// move them. The pre-fix module trashed all 3 revealed cards unconditionally with no
// selection logic, so the matching card never reached the hand.

function playCard(s: ReturnType<typeof setup>): { instanceId: string } {
  const p0 = s.state.players[0] as PlayerState;
  p0.battleArea.push(digimon(0, 3000, "AD1-011")); // §4-21 color-requirement source (Green)
  const option = instance("BT21-097", 0, true);
  p0.hand.push(option);
  s.state.memory = 0;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({
    ok: true,
  });
  return { instanceId: option.instanceId };
}

describe("BT21-097 [Main] reveal-and-add", () => {
  it("adds the [Appmon]/[App Driver] card from the reveal to hand, trashes the rest", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    const appmonCard = instance("BT21-084", 0, false); // [App Driver]/[Appmon]
    const filler1 = instance("AD1-001", 0, false); // neither
    const filler2 = instance("AD1-001", 0, false); // neither
    p0.deck.push(appmonCard, filler1, filler2);

    playCard(s);
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "BT21-097"));
    await settle(() => false, 60);

    expect(s.events.some((e) => e.kind === "actionRejected")).toBe(false);
    // The matching card lands in hand — the reveal alone never moves it.
    expect(p0.hand.some((c) => c.instanceId === appmonCard.instanceId)).toBe(true);
    // The filler cards are trashed, not left in hand or deck.
    expect(p0.trash.some((c) => c.instanceId === filler1.instanceId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === filler2.instanceId)).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === filler1.instanceId)).toBe(false);
    expect(p0.hand.some((c) => c.instanceId === filler2.instanceId)).toBe(false);
    // The option itself is placed in the battle area (not trashed).
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "BT21-097")).toBe(true);
    expect(p0.trash.some((c) => c.cardId === "BT21-097")).toBe(false);
  });
});
