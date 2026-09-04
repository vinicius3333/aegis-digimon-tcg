import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine as setup, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
// Self-registers every card module (boot side-effect) so the engine can look up
// EX5-063's [All Turns] deletion-memory effect.
import "../index.js";

/**
 * A3 for EX5-063 (Leviamon) — [All Turns] "When an opponent's Digimon is deleted, gain
 * 1 memory for each Digimon."
 *
 * The clause reads `ctx.trigger.deletedInstanceIds` / `deletedWasStackInstanceIds`
 * (EffectContext.ts), populated by every deletion seam (GameEngine.ts fires
 * `OnDestroyedAnyone` after `primitives.deletePermanent` moves cards to trash). KB
 * Q6037/Q6038 (binding): gain 1 memory per OPPONENT Digimon deleted, even when several
 * are deleted simultaneously; never count the controller's own.
 *
 * Vehicle: EX5-063's OWN [On Play] clause deletes the opponent's highest- then
 * lowest-level Digimon in one batch (2 distinct opponent Digimon here), so the [All
 * Turns] clause should observe BOTH deletions in the single OnDestroyedAnyone window
 * they open and gain 2 memory.
 *
 */
describe("EX5-063 [All Turns] gain 1 memory per opponent Digimon deleted (KB Q6037/Q6038)", () => {
  it("deletes highest then lowest through public When Digivolving and counts both deletions", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "EX5-060", as: "base" }],
          hand: [{ card: "EX5-063", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT1-020", dp: 9000, as: "highest" },
            { card: "BT1-009", dp: 2000, as: "lowest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const p1 = s.state.players[1] as PlayerState;
    const highestId = s.perm("highest").permanentId;
    const lowestId = s.perm("lowest").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => p1.battleArea.length === 0);
    expect(p1.battleArea.some((p) => p.permanentId === highestId)).toBe(false);
    expect(p1.battleArea.some((p) => p.permanentId === lowestId)).toBe(false);
    expect(s.state.memory).toBe(2);
  });

  it("still deletes the lowest when the opponent has fewer total Digimon and Tamers", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "own1" },
            { card: "BT1-010", as: "own2" },
            { card: "BT1-011", as: "own3" },
          ],
          hand: [{ card: "EX5-063", as: "source" }],
        },
        1: {
          battleArea: [
            { card: "BT1-020", dp: 9000, as: "highest" },
            { card: "BT1-009", dp: 2000, as: "lowest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    const p1 = s.state.players[1] as PlayerState;
    const highestId = s.perm("highest").permanentId;
    const lowestId = s.perm("lowest").permanentId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !p1.battleArea.some((p) => p.permanentId === lowestId));
    expect(p1.battleArea.some((p) => p.permanentId === highestId)).toBe(true);
    expect(p1.battleArea.some((p) => p.permanentId === lowestId)).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("its own [On Play] deletes 2 opponent Digimon in one batch -> +2 memory", async () => {
    const s = setup(
      {
        0: { hand: [{ card: "EX5-063", as: "source" }] }, // playCost 13
        1: {
          battleArea: [
            { card: "BT1-020", dp: 9000, as: "highest" }, // Lv.5
            { card: "BT1-009", dp: 2000, as: "lowest" }, // Lv.3
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;

    const highest = s.perm("highest");
    const lowest = s.perm("lowest");
    const source = s.inst("source");
    s.state.memory = 13; // exactly affordable; 0 left after the play cost

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });

    await settle(() => !p1.battleArea.some((p) => p.permanentId === highest.permanentId));
    await settle(() => !p1.battleArea.some((p) => p.permanentId === lowest.permanentId));
    await settle(() => s.state.memory === 2);

    // Both opponent Digimon are actually gone (the [On Play] deletion happened).
    expect(p1.battleArea).toHaveLength(0);
    expect(p1.trash.some((c) => c.instanceId === highest.topCard?.instanceId)).toBe(true);
    expect(p1.trash.some((c) => c.instanceId === lowest.topCard?.instanceId)).toBe(true);

    // [All Turns] counted both opponent deletions in the single OnDestroyedAnyone batch.
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("exactness control (Q6037): a deleted Digimon's digivolution-stack material does not double-count", async () => {
    const s = setup(
      {
        0: { hand: [{ card: "EX5-063", as: "source" }] }, // playCost 13
        1: {
          battleArea: [
            // A single opponent Digimon with ONE digivolution card underneath it. Deleting it
            // moves BOTH the top card and the stack card to trash (2 trashed instances), but
            // it is still only 1 DELETED DIGIMON — the count must subtract the stack-card
            // instance, not just tally every trashed card instance.
            { card: "BT1-020", dp: 9000, as: "onlyTarget", under: ["BT1-009"] }, // Lv.5
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;

    const onlyTarget = s.perm("onlyTarget");
    const source = s.inst("source");
    s.state.memory = 13;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });

    await settle(() => !p1.battleArea.some((p) => p.permanentId === onlyTarget.permanentId));
    await settle(() => s.state.memory !== 0);

    // Both the top card and its stack material left the field...
    expect(p1.trash.some((c) => c.instanceId === onlyTarget.topCard?.instanceId)).toBe(true);
    expect(p1.trash.some((c) => c.cardId === "BT1-009")).toBe(true);
    // ...but only 1 opponent DIGIMON was deleted, so [All Turns] gains exactly 1, not 2.
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("credits ITS OWN controller (not turnSeat) when the clause fires on the OPPONENT's turn", async () => {
    const s = setup({
      // EX5-063 is already on seat 0's battle area from a prior turn (laid directly, not
      // played this turn, so its [On Play] clause never fires here -- only [All Turns]).
      0: {
        battleArea: [{ card: "EX5-063", dp: 9000, as: "leviamon" }],
        security: [{ card: "BT1-009" }], // 3000 DP security Digimon
      },
      1: { battleArea: [{ card: "AD1-001", dp: 1000, as: "attacker" }] },
    });
    const p1 = s.state.players[1] as PlayerState;

    // It is seat 1's turn. Seat 1 attacks with its OWN Digimon into seat 0's security;
    // seat 0's security Digimon has more DP, so seat 1's attacker loses and is deleted.
    // From EX5-063's perspective (controller = seat 0), that is still "an opponent's
    // Digimon is deleted" -- [All Turns] is not restricted to EX5-063's controller's own
    // turn, so this must fire and credit seat 0, even though it is seat 1's turn.
    s.state.turnSeat = 1;
    const attacker = s.perm("attacker");

    // memoryFor mirrors MemoryGauge.memoryFor: state.memory is stored relative to
    // turnSeat, so reading a seat's own-perspective value must account for whose turn
    // it is -- asserting on the raw sign of state.memory would silently pass for
    // whichever seat happens to be turnSeat, which is exactly the bug being caught here.
    const memoryFor = (seat: 0 | 1): number => (seat === s.state.turnSeat ? s.state.memory : -s.state.memory) || 0; // normalize -0 -> 0
    expect(memoryFor(0)).toBe(0);
    expect(memoryFor(1)).toBe(0);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => !p1.battleArea.some((p) => p.permanentId === attacker.permanentId));
    await settle(() => false, 60); // flush the battle/deletion resolution

    // The attacker (seat 1's own Digimon) is actually gone.
    expect(p1.trash.some((c) => c.instanceId === attacker.topCard?.instanceId)).toBe(true);

    // EX5-063's controller (seat 0) gains the memory -- not seat 1, even though seat 1
    // is turnSeat when the deletion happens.
    expect(memoryFor(0)).toBe(1);
    expect(memoryFor(1)).toBe(-1);
    assertNoLoudGap(s);
  });
});
