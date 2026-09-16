import { Phase, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

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
    expect(s.perm("greenPeer").currentDP).toBe(4000);
    expect(s.perm("opponentBlue").currentDP).toBe(3000);

    await advance(s.engine).verb.deletePermanent([s.perm("greenPeer").permanentId], "byEffect");
    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does not count the host itself, a green Tamer, an opponent green Digimon, or green cards outside the battle area", async () => {
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

    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("host").currentDP).toBe(3000);
    advance(s.engine).endMainPhaseIfOpen(1);

    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(5000);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("carries the DP bonus through the real Digi-Egg route: hatch -> digivolve in breeding -> battle area", async () => {
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

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT19-004");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

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

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    const carrier = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === eggPermanentId)!;
    expect(carrier.topCard!.cardId).toBe("BT1-064");
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    expect(carrier.currentDP).toBe(3000);

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
