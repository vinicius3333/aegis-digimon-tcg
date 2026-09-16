import { describe, expect, it } from "vitest";
import { Phase, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-002 Puyoyomon", () => {
  it("returns its Aqua host to deck bottom and bounces only up to the returned level", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-033", as: "host", under: ["BT1-028", "BT19-002"] }] },
        1: {
          battleArea: [
            { card: "BT19-023", as: "attacker" },
            { card: "BT19-069", as: "level4" },
            { card: "BT19-024", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => (s.state.players[1] as PlayerState).hand.length > 0);

    expect((s.state.players[0] as PlayerState).deck.map((card) => card.cardId)).toEqual(["BT1-033"]);
    expect((s.state.players[0] as PlayerState).trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-028", "BT19-002"]),
    );
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([]);
    expect((s.state.players[1] as PlayerState).hand.map((card) => card.cardId)).toEqual(["BT19-069"]);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-024")).toBe(true);
  });

  it("may decline the return cost and leaves both boards unchanged", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-033", as: "host", under: ["BT1-028", "BT19-002"] }] },
        1: { battleArea: [{ card: "BT19-023", as: "attacker" }, { card: "BT19-069" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });

  it("resolves MarineBullmon's Decode interruption before the level-5 bounce from Q3058", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-024", as: "host", under: ["BT19-019", "BT19-002"] }] },
        1: {
          battleArea: [
            { card: "BT19-028", as: "attacker" },
            { card: "BT19-023", as: "level5" },
            { card: "BT19-028", as: "level6" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => (s.state.players[1] as PlayerState).hand.length > 0);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-019"]);
    expect((s.state.players[0] as PlayerState).deck.map((card) => card.cardId)).toEqual(["BT19-024"]);
    expect((s.state.players[1] as PlayerState).hand.map((card) => card.cardId)).toEqual(["BT19-023"]);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-028")).toBe(true);
  });
  it("carries the inherited bounce through the real Digi-Egg route and only up to the returned level", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT19-002", as: "egg" }],
          hand: [
            { card: "BT6-020", as: "gizamon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-009", "BT1-014", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "attacker" },
            { card: "BT1-009", as: "levelThreePeer" },
            { card: "BT1-014", as: "levelFourPeer" },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-012", "BT1-014", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("levelFourPeer").topCard!.instanceId);
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT19-002");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("gizamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT6-020");
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    const opponentHandInBreedingTurn = s.state.players[1]!.hand.map(({ instanceId }) => instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT6-020");
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toEqual(opponentHandInBreedingTurn);
    expect(s.state.players[1]!.battleArea).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(1);

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(carrier.topCard!.cardId).toBe("BT6-020");
    const hostInstanceId = carrier.topCard!.instanceId;
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    const levelThreeInstanceId = s.perm("levelThreePeer").topCard!.instanceId;
    const levelFourPermanentId = s.perm("levelFourPeer").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const opponentHandBeforeBounce = s.state.players[1]!.hand.map(({ instanceId }) => instanceId);
    await settle(() => s.state.players[1]!.hand.some(({ instanceId }) => instanceId === levelThreeInstanceId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    const deck = s.state.players[0]!.deck;
    expect(deck[deck.length - 1]!.instanceId).toBe(hostInstanceId);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === eggInstanceId)).toBe(true);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [...opponentHandBeforeBounce, levelThreeInstanceId].sort(),
    );
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(levelFourPermanentId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
  it("cannot pay the cost when its host lacks the [Aqua]/[Sea Animal] traits", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-016", as: "host", under: ["BT19-002"] }] },
        1: {
          battleArea: [
            { card: "BT1-014", as: "attacker" },
            { card: "BT1-009", as: "levelThreePeer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT19-016"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
