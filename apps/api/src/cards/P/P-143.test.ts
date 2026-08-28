import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for P-143 (Drimogemon) — [End of Your Turn][Once Per Turn] move to breeding:
//   "You may place this Digimon to the empty space in your breeding area." (documented behavior)
//
// KB authority (binding):
//   Q4251: digivolution cards are NOT trashed when it moves to the breeding area.
//   Q4250: <Overflow> in its digivolution cards is NOT processed on this move.
//   Q4256: a suspended Digimon stays suspended after the move.
//
// FAILS-WHEN-REVERTED: drop/no-op the [End of Your Turn] body in P-143.ts — the
// Digimon stays in the battle area after fireTiming(OnEndTurn) and the breeding-area
// presence assertion goes RED.
//
// The hand-written module also grants inherited <Piercing> (OnDetermineDoSecurityCheck),
// but that timing is covered by the existing mechanic.test.ts Pierce suite.

function fireTiming(
  s: ReturnType<typeof setupEngine>,
  timing: EffectTiming,
  trigger: Record<string, unknown> = {},
): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(timing, trigger);
}

describe("P-143 [End of Your Turn][OPT] move to breeding area", () => {
  it("moves Drimogemon from the battle area to the empty breeding area on end of turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-143", dp: 5000, as: "drimogemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const drimogemonId = s.perm("drimogemon").permanentId;

    // Breeding area is empty — gate satisfied (documented behavior GetBreedingAreaPermanents().Count == 0).
    expect(p0.breeding).toBeUndefined();

    await fireTiming(s, EffectTiming.OnEndTurn);
    await settle(() => p0.breeding !== undefined);

    // P-143 moved to the breeding area.
    expect(p0.breeding).toBeDefined();
    expect(p0.breeding!.permanentId).toBe(drimogemonId);
    // It is no longer in the battle area.
    expect(p0.battleArea.some((perm) => perm.permanentId === drimogemonId)).toBe(false);
  });

  it("preserves digivolution cards when moving to breeding (KB Q4251)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-143", dp: 5000, as: "drimogemon", under: [{ card: "BT1-001", as: "stackCard", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const stackCardId = s.inst("stackCard").instanceId;

    await fireTiming(s, EffectTiming.OnEndTurn);
    await settle(() => p0.breeding !== undefined);

    // The digivolution card is still in the stack — NOT trashed (Q4251).
    expect(p0.breeding!.stack.some((c) => c.instanceId === stackCardId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === stackCardId)).toBe(false);
  });

  it("does NOT move when the breeding area is already occupied", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-143", dp: 5000, as: "drimogemon" }],
          breeding: { card: "BT1-001", dp: 3000, as: "breeder" },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const drimogemonId = s.perm("drimogemon").permanentId;
    const breedingBefore = s.perm("breeder").permanentId;

    await fireTiming(s, EffectTiming.OnEndTurn);
    for (let i = 0; i < 30; i++) await Promise.resolve();

    // The breeding area still holds the original occupant; P-143 stays in battle.
    expect(p0.breeding?.permanentId).toBe(breedingBefore);
    expect(p0.battleArea.some((perm) => perm.permanentId === drimogemonId)).toBe(true);
  });

  it("does NOT move when it is not the owner's turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-143", dp: 5000, as: "drimogemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1; // not seat 0's turn — [End of Your Turn] / [Your Turn] gate fails
    const p0 = s.state.players[0] as PlayerState;
    const drimogemonId = s.perm("drimogemon").permanentId;

    await fireTiming(s, EffectTiming.OnEndTurn);
    for (let i = 0; i < 30; i++) await Promise.resolve();

    // P-143 stays in the battle area — guard requires it to be the owner's turn.
    expect(p0.breeding).toBeUndefined();
    expect(p0.battleArea.some((perm) => perm.permanentId === drimogemonId)).toBe(true);
  });
});
