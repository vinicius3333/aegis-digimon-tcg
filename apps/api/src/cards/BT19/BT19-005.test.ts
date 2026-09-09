import { Phase, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// BT19-005 Hopmon — Black Digi-Egg, Lv.2 In-Training, Baby Dragon.
// Inherited: "[Opponent's Turn] While your opponent has a Digimon, this Digimon gains ＜Reboot＞."
//
// ＜Reboot＞ (§16-11-1) unsuspends the Digimon during the OPPONENT's unsuspend phase, so the
// clause is behaviourally observable: a host suspended on your own turn stands back up at the
// start of the opponent's turn, and only while the opponent actually controls a Digimon.
//
// Inert catalog cards keep the assertions clean: BT2-052 Hagurumon (Black Lv3, 3000 DP,
// digivolves from a Black Lv2 at cost 0), BT1-028 Elecmon (Blue Lv3) as the opponent Digimon,
// BT1-088 Izzy Izumi as the opponent's non-Digimon near-miss permanent ([Main]-only, inert).
describe("BT19-005 Hopmon", () => {
  it("grants only its host ＜Reboot＞ on the opponent's turn while they have a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-052", as: "host", under: ["BT19-005"] },
          { card: "BT2-052", as: "ownPeer" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-028", as: "opponentDigimon" },
          { card: "BT1-088", as: "opponentTamer" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    // Self-only Aura: the other own Digimon and the opponent's Digimon gain nothing.
    expect(observe(s.engine).hasKeyword(s.perm("ownPeer"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponentDigimon"), "Reboot")).toBe(false);

    // Your own turn: [Opponent's Turn] is off.
    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);

    // Opponent's turn again, but their only remaining permanent is a Tamer: the condition
    // asks for a Digimon, so the near-miss peer does not satisfy it.
    s.state.turnSeat = 1;
    await advance(s.engine).verb.deletePermanent([s.perm("opponentDigimon").permanentId], "byEffect");
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("opponentTamer").permanentId,
    ]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
  });

  it("actually unsuspends the host during the opponent's unsuspend phase, while a plain peer stays suspended", async () => {
    // Both own Digimon attack into security on your turn, so both end the turn suspended.
    // 20 000 DP keeps them alive through the security check; only the Hopmon host has ＜Reboot＞.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "host", dp: 20_000, under: ["BT19-005"] },
            { card: "BT2-052", as: "plainPeer", dp: 20_000 },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-028", as: "opponentDigimon" }],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013", "BT1-012", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
    for (const alias of ["host", "plainPeer"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(alias).isSuspended && !observe(s.engine).isAttacking());
    }
    expect(s.state.turnSeat).toBe(0);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("plainPeer").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);

    // Opponent's unsuspend phase: ＜Reboot＞ stands the host back up; the plain peer does not.
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("plainPeer").isSuspended).toBe(true);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("leaves the host suspended through the opponent's turn when the opponent has no Digimon", async () => {
    // Same flow, but the opponent controls only a Tamer. Without the condition the keyword is
    // never granted, so the opponent's unsuspend phase leaves the host down.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-052", as: "host", dp: 20_000, under: ["BT19-005"] }],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-088", as: "opponentTamer" }],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013", "BT1-012", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && !observe(s.engine).isAttacking());
    expect(s.state.turnSeat).toBe(0);
    expect(s.perm("host").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
    expect(s.perm("host").isSuspended).toBe(true);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("carries ＜Reboot＞ through the real Digi-Egg route: hatch -> digivolve in breeding -> battle area", async () => {
    // Peer/stack case. Every zone change is a public intent: `hatchEgg` takes BT19-005 off the
    // egg deck in the production Breeding window, the Black Lv3 BT2-052 digivolves onto it in
    // the breeding area (Black Lv2, cost 0), and `moveFromBreeding` carries the stack into the
    // battle area on the next own turn. Only then does the inherited [Opponent's Turn] Aura
    // fire from under the real host.
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT19-005", as: "egg" }],
          hand: [{ card: "BT2-052", as: "hagurumon" }],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "opponentDigimon" },
            { card: "BT1-088", as: "opponentTamer" },
          ],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    // Turn 1 (seat 0): hatch the Digi-Egg.
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT19-005");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

    // Digivolve the Black Lv3 onto the egg inside the breeding area.
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("hagurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-052");
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect((s.state.players[0] as PlayerState).hand.some(({ cardId }) => cardId === "BT2-052")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    // Turn 3 (seat 0): move the raised stack into the battle area.
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(carrier.topCard!.cardId).toBe("BT2-052");
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(carrier, "Reboot")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);

    // Turn 4 (seat 1): the opponent has a Digimon, so the inherited clause grants ＜Reboot＞.
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(carrier, "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("opponentDigimon"), "Reboot")).toBe(false);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
