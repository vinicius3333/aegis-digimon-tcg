import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-002.js";
import "../index.js";

describe("EX4-002 Kokomon", () => {
  it("draws once per turn when an effect suspends one of your Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
  });

  it("draws when an effect suspends any own Digimon, not only the host carrying Kokomon", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010"],
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX4-002"] },
          { card: "BT1-010", as: "other" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("other").permanentId], 0);
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("hatches Kokomon publicly, digivolves for 0, and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "EX4-002", as: "host" }],
        hand: [{ card: "BT1-064", as: "goblimon" }],
        deck: [{ card: "BT1-010", as: "turnDraw" }, { card: "BT1-011", as: "drawn" }, "BT1-012"],
        security: ["BT1-010"],
      },
      1: { deck: ["BT1-013", "BT1-014"], security: ["BT1-010"] },
    });
    await s.ready();
    // This route intentionally exercises both the ordinary Draw phase and the mandatory
    // digivolution bonus draw; the harness otherwise starts on the first player's draw-skip turn.
    s.state.isFirstPlayersFirstTurn = false;
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);

    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX4-002");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("goblimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-064");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("turnDraw").instanceId, s.inst("drawn").instanceId]),
    );
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect(s.state.players[0]!.breeding!.topCard!.instanceId).toBe(s.inst("goblimon").instanceId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === breedingPermanentId));
    const host = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === breedingPermanentId)!;
    expect(host.topCard!.instanceId).toBe(s.inst("goblimon").instanceId);
    expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not draw when an effect suspends an opposing Digimon", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-010"], battleArea: [{ card: "BT1-009", as: "host", under: ["EX4-002"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId], 0);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw when an attack suspends the host", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-010"], battleArea: [{ card: "BT1-009", dp: 5000, as: "host", under: ["EX4-002"] }] },
      1: { battleArea: [{ card: "BT1-009", dp: 1000, as: "defender" }], security: ["BT1-010"] },
    });
    await s.ready();
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // This attack targets the player directly with no blocker in play, so it resolves
    // through the security-check path rather than a Digimon-vs-Digimon battle;
    // combatResolved is only emitted for the latter, so it never fires here.
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw from Q3438's start-of-main forced attack on the real stack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-107", as: "option" }],
          deck: ["BT1-013", "BT1-014"],
          battleArea: [
            { card: "BT12-061", as: "black" },
            { card: "BT1-009", as: "sink", suspended: true },
          ],
          security: ["BT1-010"],
        },
        1: {
          eggDeck: [{ card: "EX4-002", as: "host" }],
          hand: [{ card: "BT1-064", as: "goblimon" }],
          deck: [
            { card: "BT1-010", as: "turnDraw" },
            { card: "BT1-011", as: "drawn" },
            "BT1-012",
            "BT1-013",
            "BT1-014",
            "BT1-015",
          ],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    // Keep the first-turn draw in this route so the separate digivolution bonus draw remains
    // observable as a second card, matching the public-route peer fixtures.
    s.state.isFirstPlayersFirstTurn = false;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);

    expect(s.engine.applyIntent(1, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.breeding?.topCard?.cardId === "EX4-002");
    const breedingPermanentId = s.state.players[1]!.breeding!.permanentId;
    const eggInstanceId = s.state.players[1]!.breeding!.topCard!.instanceId;
    const goblimonInstanceId = s.inst("goblimon").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: goblimonInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.breeding?.topCard?.cardId === "BT1-064");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("turnDraw").instanceId, s.inst("drawn").instanceId]),
    );
    expect(s.state.players[1]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === breedingPermanentId));
    const host = s.state.players[1]!.battleArea.find(({ permanentId }) => permanentId === breedingPermanentId)!;
    expect(host.topCard!.instanceId).toBe(goblimonInstanceId);
    expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      observe(s.engine)
        .customEffectGrants()
        .some(({ instanceId }) => instanceId === host.topCard!.instanceId),
    );

    const handBeforeStartMain = s.state.players[1]!.hand.map(({ instanceId }) => instanceId);
    const deckBeforeStartMain = s.state.players[1]!.deck.map(({ instanceId }) => instanceId);
    const normalTurnDraw = deckBeforeStartMain[0]!;
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => host.isSuspended);

    expect(host.isSuspended).toBe(true);
    // The real turn loop's Draw phase legitimately adds one card before Start of Main; Q3438's
    // forced attack must not add another draw when its rule-caused suspension is observed.
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      ...handBeforeStartMain,
      normalTurnDraw,
    ]);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckBeforeStartMain.slice(1));
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("draws only once when effects suspend multiple Digimon in the same turn", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011"],
        battleArea: [
          { card: "BT1-009", as: "first", under: ["EX4-002"] },
          { card: "BT1-009", as: "second" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("first").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);
    await advance(s.engine).verb.unsuspend([s.perm("first").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("second").permanentId]);
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("re-arms on the next own turn after refusing a second same-turn trigger", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX4-002"] },
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
      },
      1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    s.state.turnSeat = 0;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    await advance(s.engine).verb.suspend([s.perm("first").permanentId], 0);
    await settle(() => s.state.players[0]!.hand.length === 1);
    await advance(s.engine).verb.unsuspend([s.perm("first").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("second").permanentId], 0);
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const handAfterTurnDraw = s.state.players[0]!.hand.length;

    await advance(s.engine).verb.suspend([s.perm("first").permanentId], 0);
    await settle(() => s.state.players[0]!.hand.length === handAfterTurnDraw + 1);
    expect(s.state.players[0]!.hand).toHaveLength(handAfterTurnDraw + 1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });
});
