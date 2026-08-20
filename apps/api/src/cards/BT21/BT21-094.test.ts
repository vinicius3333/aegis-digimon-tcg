import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import {
  makeInstance as instance,
  makeDigimon as digimon,
  setupEngine as setup,
  settle,
} from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-094.js";
import "../index.js";

// A3 for BT21-094 (Armor Digivolution) — [Main]/[Security]:
//   Reveal the top 3 cards of your deck. Add 1 card with [Davis Motomiya] in its name and
//   1 card with the [Free] trait among them to the hand. Trash the rest. Then, place this
//   card in the battle area.
//
// FAILS-WHEN-REVERTED: `ctx.fx.reveal` only flips cards face-up in place — it does not
// move them. The pre-fix module trashed all 3 revealed cards unconditionally with no
// selection logic, so the matching cards never reached the hand.

function playCard(s: ReturnType<typeof setup>): { instanceId: string } {
  const p0 = s.state.players[0] as PlayerState;
  p0.battleArea.push(digimon(0, 3000, "AD1-011")); // §4-21 color-requirement source (Blue)
  const option = instance("BT21-094", 0, true);
  p0.hand.push(option);
  s.state.memory = 0;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({
    ok: true,
  });
  return { instanceId: option.instanceId };
}

describe("BT21-094 [Main] reveal-and-add", () => {
  it("adds the [Davis Motomiya] and [Free] cards from the reveal to hand, trashes the rest", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    const davisNamed = instance("BT3-093", 0, false); // Davis Motomiya
    const freeTraited = instance("BT17-077", 0, false); // [Free] trait
    const filler = instance("AD1-001", 0, false); // neither
    p0.deck.push(davisNamed, freeTraited, filler);

    playCard(s);
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "BT21-094"));
    await settle(() => false, 60);

    expect(s.events.some((e) => e.kind === "actionRejected")).toBe(false);
    // Both matching cards land in hand — the reveal alone never moves them.
    expect(p0.hand.some((c) => c.instanceId === davisNamed.instanceId)).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === freeTraited.instanceId)).toBe(true);
    // The filler card is trashed, not left in hand or deck.
    expect(p0.trash.some((c) => c.instanceId === filler.instanceId)).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === filler.instanceId)).toBe(false);
    // The option itself is placed in the battle area (not trashed).
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "BT21-094")).toBe(true);
    expect(p0.trash.some((c) => c.cardId === "BT21-094")).toBe(false);
  });
});

describe("BT21-094 Delay watcher", () => {
  it("keeps the Armor Form trash watcher separate from its Delay payload", () => {
    const allTurns = compiled.effects.filter((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toHaveLength(2);
    expect(allTurns[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenDigivolutionTrashed",
      sourceFilter: { nameOrTrait: [{ tokens: ["Armor Form"], match: "trait" }] },
      requireTrashedDigivolutionCardWasTop: true,
    });
    expect(allTurns[1]?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(allTurns[1]?.actions[0]).toMatchObject({
      kind: "Digivolve",
      payCost: false,
      from: ["hand"],
      optional: true,
      into: { nameOrTrait: [{ tokens: ["Armor Form"], match: "trait" }] },
    });
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security", isSecurity: true }));
  });
});
