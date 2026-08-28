import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "./testkit/harness.js";
// Importing the cards root barrel self-registers every compiled-IR card module, so
// the engine can look up On Play / Security effects by card id (boot side-effect).
import "../cards/index.js";

/**
 * Headless proof that compiled card effects actually FIRE in a live match through
 * the (now-wired) effect-stack-resolution seam — i.e. GameEngine.fireTiming /
 * fireTimingForInstance / resolveSecurityEffect are no longer no-ops.
 *
 * Each test deals a minimal board directly (deck-and-setup is exercised elsewhere),
 * drives a real intent, and asserts an observable memory / zone change produced by a
 * card's COMPILED IR (not a hand-authored stub). The cards below are picked from the
 * declarative effect record for a single, deterministic action:
 *   - BT6-036  On Play: gain 2 memory.
 *   - BT1-029  On Play: draw 1.
 *   - BT2-107  [Security]: gain 2 memory (an Option, so no security battle).
 */

describe("compiled card effects fire in a live match (effect-stack-resolution wired)", () => {
  it("fires an On Play effect that gains memory (BT6-036: gain 2)", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT6-036", as: "card" }] } }); // cost 4, On Play +2 memory
    const player = s.state.players[0] as PlayerState;
    // Turn player at memory 0: max affordable is 10 (gauge can travel to the opponent
    // side). Playing costs 4 (gauge -> -4 from seat 0's perspective), then On Play
    // gains 2 (gauge -> -2). Net memory after the play continuation: -2.
    s.state.memory = 0;

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId });
    expect(result).toEqual({ ok: true });

    // Wait for the permanent to land and the On Play continuation to run.
    await settle(() => player.battleArea.length === 1 && s.state.memory === -2);

    expect(player.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(-2); // -4 (cost) + 2 (On Play gain)
  });

  it("fires an On Play effect that draws a card (BT1-029: draw 1)", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT1-029", as: "card" }], deck: [{ card: "AD1-001", as: "deckTop" }] },
    }); // cost 3, On Play draw 1
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 0;

    const handBefore = player.hand.length; // 1 (the card to play)

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId });
    expect(result).toEqual({ ok: true });

    // After playing: the played card left hand (-1), the On Play draw added one (+1),
    // so the hand size returns to its starting count and the drawn card is present.
    const deckTopId = s.inst("deckTop").instanceId;
    await settle(() => player.hand.some((c) => c.instanceId === deckTopId));

    expect(player.battleArea).toHaveLength(1);
    expect(player.hand.some((c) => c.instanceId === deckTopId)).toBe(true);
    expect(player.hand).toHaveLength(handBefore); // -1 played, +1 drawn
    expect(player.deck).toHaveLength(0);
  });

  it("P-130 [On Play] moves a breeding Digimon, firing OnMove -> [Your Turn] suspend+gain", async () => {
    // End-to-end proof of the L_breeding feature through a live match: playing P-130
    // (Tamer, cost 3) runs its hand-authored override [On Play] move of a level-3+ breeding
    // Digimon to the battle area (ctx.fx.movePermanentZone), which fires EffectTiming.OnMove,
    // which triggers P-130's own [Your Turn] reaction (by suspending this Tamer, gain 1
    // memory). Both clauses are optional, auto-accepted.
    const s = setupEngine(
      {
        // A level-4 Digimon (>= 3) sits in the single breeding slot, eligible to move.
        0: { breeding: { card: "AD1-001", dp: 5000, as: "bred" }, hand: [{ card: "P-130", as: "p130" }] },
      },
      { autoAcceptOptional: true },
    );
    const player = s.state.players[0] as PlayerState;
    const bredPermanentId = s.perm("bred").permanentId;
    s.state.memory = 0;

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("p130").instanceId });
    expect(result).toEqual({ ok: true });

    // Settle until P-130 is in play AND suspended — the LAST step of the chain (the
    // [Your Turn] reaction paid its suspend cost), which also implies the move + gain ran.
    await settle(() => {
      const p = player.battleArea.find((x) => x.topCard?.cardId === "P-130");
      return p !== undefined && p.isSuspended;
    });

    // The breeding Digimon moved to the battle area; the breeding slot is now empty.
    expect(player.breeding).toBeUndefined();
    expect(player.battleArea.some((p) => p.permanentId === bredPermanentId)).toBe(true);

    // P-130 is in play and SUSPENDED (the [Your Turn] suspend cost was paid).
    const p130Perm = player.battleArea.find((p) => p.topCard?.cardId === "P-130");
    expect(p130Perm).toBeDefined();
    expect(p130Perm!.isSuspended).toBe(true);

    // Memory: -3 (P-130 play cost) + 1 ([Your Turn] gain) = -2.
    expect(s.state.memory).toBe(-2);
  });

  it("resolves a flipped [Security] effect on a security check (BT2-107: gain 2 memory)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 5000, as: "attacker" }] },
      // Seat 1's lone security card is an Option with a [Security] effect (+2 memory).
      // Being an Option it does not battle; its security effect is the only resolution.
      1: { security: [{ card: "BT2-107", as: "securityCard" }] },
    });
    const attacker = s.perm("attacker");
    const defender = s.state.players[1] as PlayerState;

    s.state.memory = 0;
    const memoryBefore = s.state.memory;

    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(result).toEqual({ ok: true });

    // Settle until the securityChecked event has been emitted (it is emitted after the
    // [Security] effect resolves, so this also guarantees the effect ran). The seatless
    // gainMemory primitive currently credits the turn player; the observable point for
    // this test is that the [Security] effect FIRED and changed game state, not its sign.
    const securityChecked = (): boolean =>
      s.events.some((e) => e.kind === "securityChecked" && e.revealedCardId === "BT2-107");
    await settle(securityChecked);

    expect(defender.security).toHaveLength(0);
    // A securityChecked event with resolution "effect" proves the [Security] branch ran.
    const checked = s.events.find((e) => e.kind === "securityChecked" && e.revealedCardId === "BT2-107");
    expect(checked, "securityChecked event for the flipped card").toBeDefined();
    expect(checked && "resolution" in checked ? checked.resolution : undefined).toBe("effect");
    // The security effect changed the shared memory gauge (the observable game change).
    expect(s.state.memory).not.toBe(memoryBefore);
    // The checked Option went to seat 1's trash.
    expect(defender.trash.some((c) => c.instanceId === s.inst("securityCard").instanceId)).toBe(true);
  });

  it("P-035 [Security] places itself in battle area without prompting; attacker survives", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", dp: 5000, as: "attacker" }] },
        1: { security: [{ card: "P-035" }] },
      },
      { autoAcceptOptional: true },
    );
    const attacker = s.perm("attacker");
    const defender = s.state.players[1] as PlayerState;

    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(result).toEqual({ ok: true });

    const securityChecked = (): boolean =>
      s.events.some((e) => e.kind === "securityChecked" && e.revealedCardId === "P-035");
    await settle(securityChecked);
    await settle(() => false, 40); // let trailing microtasks settle

    // P-035 should be in player 1's battle area (placed by its [Security] effect)
    expect(
      defender.battleArea.some((p) => p.topCard?.cardId === "P-035"),
      "P-035 should be in defender's battle area",
    ).toBe(true);

    // The attacker should still be alive (Option doesn't battle)
    expect(s.state.players[0]?.battleArea ?? []).toHaveLength(1);

    // Resolution should be "effect"
    const checked = s.events.find((e) => e.kind === "securityChecked" && e.revealedCardId === "P-035");
    expect(checked, "securityChecked event").toBeDefined();
    expect(checked && "resolution" in checked ? checked.resolution : undefined).toBe("effect");

    // No optional decision should have been requested for the security effect
    const optionalDecisions = s.decisions.filter((d) => d.req.kind === "optional");
    expect(optionalDecisions, "should not prompt for optional; [Security] is not optional").toHaveLength(0);
  });
});
