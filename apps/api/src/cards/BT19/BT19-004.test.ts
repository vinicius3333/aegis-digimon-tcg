import { Phase, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// BT19-004 Tokomon — Green Digi-Egg, Lv.2 In-Training, Lesser.
// Inherited: "[Your Turn] While you have another green Digimon, this Digimon gets +2000 DP."
//
// Hosts and peers are inert catalog Digimon so every asserted DP number belongs to this
// clause alone: BT1-064 Goblimon (Green Lv3, 3000 DP, digivolves from a Green Lv2 at cost 0),
// BT1-065 Mushroomon (Green Lv3, 4000 DP), BT1-028 Elecmon (Blue Lv3, 3000 DP).
describe("BT19-004 Tokomon", () => {
  it("gives its host +2000 DP on your turn while you have another green Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "host", under: ["BT19-004"] },
          { card: "BT1-065", as: "greenPeer" },
        ],
      },
      1: { battleArea: [{ card: "BT1-028", as: "opponentBlue" }] },
    });
    await s.ready();

    expect(s.state.turnSeat).toBe(0);
    expect(s.perm("host").currentDP).toBe(5000);
    // The Aura is self-only: the other green Digimon that satisfies the condition gains nothing.
    expect(s.perm("greenPeer").currentDP).toBe(4000);
    expect(s.perm("opponentBlue").currentDP).toBe(3000);

    // Remove the only other green Digimon: the bonus lapses immediately.
    await advance(s.engine).verb.deletePermanent([s.perm("greenPeer").permanentId], "byEffect");
    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does not count the host itself, a green Tamer, an opponent green Digimon, or green cards outside the battle area", async () => {
    // Every green card here is a near-miss for one reason each:
    //   - the host is green but excluded by "another";
    //   - BT1-088 Izzy Izumi is a green Tamer, not a Digimon (its only effect is [Main], inert here);
    //   - the opponent's BT1-065 is green but not YOURS;
    //   - green Digimon in hand, trash and the breeding area are not "in play" for this count
    //     (§3-4-7: raising-area cards are not referenced by ordinary effects).
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "host", under: ["BT19-004"] },
          { card: "BT1-088", as: "greenTamer" },
        ],
        breeding: { card: "BT1-065", as: "breedingGreen" },
        hand: ["BT1-064"],
        trash: ["BT1-065"],
      },
      1: { battleArea: [{ card: "BT1-065", as: "opponentGreen" }] },
    });
    await s.ready();

    expect(s.state.turnSeat).toBe(0);
    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.perm("opponentGreen").currentDP).toBe(4000);
    expect(s.perm("breedingGreen").currentDP).toBe(4000);

    // Add a second green Digimon of your own to the battle area and the same board now qualifies.
    s.putOnBoard(0, { card: "BT1-064", as: "secondGreen" });
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("applies only on your turn, proved across a real turn boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-064", as: "host", under: ["BT19-004"] },
            { card: "BT1-065", as: "greenPeer" },
          ],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(5000);
    advance(s.engine).endMainPhaseIfOpen(0);

    // Opponent's turn: [Your Turn] is off, so the host is back to its printed 3000 DP.
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("host").currentDP).toBe(3000);
    advance(s.engine).endMainPhaseIfOpen(1);

    // Back to your turn: the bonus returns without any further input.
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(5000);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("carries the DP bonus through the real Digi-Egg route: hatch -> digivolve in breeding -> battle area", async () => {
    // Peer/stack case. Every zone change is a public intent: `hatchEgg` takes BT19-004 off the
    // egg deck in the production Breeding window, the Green Lv3 BT1-064 digivolves onto it in
    // the breeding area (Green Lv2, cost 0), and `moveFromBreeding` carries the stack into the
    // battle area on the next own turn. Only then does the inherited [Your Turn] Aura fire from
    // under the real host, and only because a second green Digimon (BT1-065) is beside it —
    // the blue near-miss peer BT1-028 does not qualify.
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT19-004", as: "egg" }],
          hand: [{ card: "BT1-064", as: "goblimon" }],
          battleArea: [{ card: "BT1-028", as: "bluePeer" }],
          deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-010", "BT1-011", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
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
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT19-004");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

    // Digivolve the Green Lv3 onto the egg inside the breeding area; the egg becomes the stack.
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("goblimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-064");
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect((s.state.players[0] as PlayerState).hand.some(({ cardId }) => cardId === "BT1-064")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    // Turn 3 (seat 0): move the raised stack into the battle area.
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    const carrier = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === eggPermanentId)!;
    expect(carrier.topCard!.cardId).toBe("BT1-064");
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    // Only the blue near-miss peer is beside it: no bonus yet.
    expect(carrier.currentDP).toBe(3000);

    // Add the green peer; the inherited Aura now applies to the host and to nothing else.
    s.putOnBoard(0, { card: "BT1-065", as: "greenPeer" });
    await advance(s.engine).recompute();
    expect(carrier.currentDP).toBe(5000);
    expect(s.perm("greenPeer").currentDP).toBe(4000);
    expect(s.perm("bluePeer").currentDP).toBe(3000);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
