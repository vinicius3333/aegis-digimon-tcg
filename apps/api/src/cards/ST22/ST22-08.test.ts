import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for ST22-08 (Offensive Plug-in V, Option) — [Security] delete 1 of your opponent's Digimon
// with the lowest DP, then add this card to the hand. source: documented behavior.
//
// FAILS-WHEN-REVERTED: the opponent's lowest-DP Digimon is deleted AND this Option moves from
// security to the hand. A no-op leaves the opponent's board and the security card untouched.

describe("ST22-08 [Security] delete the opponent's lowest-DP Digimon, then add this card to hand", () => {
  it("Main links to the chosen Digimon and compares deletion DP to that recipient", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST22-08", as: "option" }], battleArea: [{ card: "BT1-010", dp: 6000, as: "recipient" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 4000, as: "lowDp" },
            { card: "BT1-010", dp: 8000, as: "highDp" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.every((perm) => perm.topCard?.cardId !== "BT1-009"));
    expect(s.perm("recipient").linked.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === s.perm("highDp").permanentId)).toBe(true);
  });

  it("deletes the lowest-DP opponent Digimon and moves the Option from security to hand", async () => {
    const s = setupEngine(
      {
        // ST22-08 sits in the defending player's security
        0: { security: [{ card: "ST22-08", as: "option", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 2000, as: "lowDp" }, // lowest DP → the delete target
            { card: "BT1-010", dp: 6000, as: "highDp" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // opponent's turn — a security check happens on the attacker's turn
    s.state.turnSeat = 1;
    const p0 = s.state.players[0]!;
    const optionId = s.inst("option").instanceId;
    const lowDpPermanentId = s.perm("lowDp").permanentId;
    const highDpPermanentId = s.perm("highDp").permanentId;
    const p1 = s.state.players[1]!;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("highDp").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.hand.some((c) => c.instanceId === optionId));

    // The lowest-DP opponent Digimon was deleted; the higher-DP one survives.
    expect(p1.battleArea.some((perm) => perm.permanentId === lowDpPermanentId)).toBe(false);
    expect(p1.battleArea.some((perm) => perm.permanentId === highDpPermanentId)).toBe(true);
    // The Option moved from security to the hand.
    expect(p0.hand.some((c) => c.instanceId === optionId)).toBe(true);
    expect(p0.security.some((c) => c.instanceId === optionId)).toBe(false);
  });
});
