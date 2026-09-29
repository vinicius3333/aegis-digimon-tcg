import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-078.js";
import "../index.js";

describe("BT15-078", () => {
  it("grants Piercing as its inherited effect", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Piercing" }],
    }));
  it("gives opponent-played Digimon an On Deletion memory loss effect once per turn", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          actions: [{ kind: "GrantAuraToOpponents", duration: "untilOpponentTurnEnd" }],
        },
      ],
    }));
  it("may play a level 4 or lower opposing Digimon from trash suspended and redirect the attack", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        { kind: "PlayWithoutCost", from: ["trash"], payCost: false, suspended: true, suppressOnPlayEffects: true },
        { kind: "RedirectAttack", optional: true, condition: { kind: "bindingExists" } },
      ],
    }));

  it("naturally plays the opposing trash Digimon, suppresses its On Play, and redirects into it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-078", as: "waruSeadramon" }], deck: ["BT1-009", "BT1-009"] },
        1: {
          trash: [{ card: "BT15-070", as: "playedDigimon" }],
          deck: ["BT15-098", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("waruSeadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("playedDigimon").instanceId),
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(4);
    expect(s.state.memory).toBe(4);
  });

  it("fires the opponent-played deletion watcher once per turn across two natural attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-078", as: "waruSeadramon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          trash: [
            { card: "BT15-070", as: "firstPlayed" },
            { card: "BT15-070", as: "secondPlayed" },
            { card: "BT15-070", as: "thirdPlayed" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const attackerId = s.perm("waruSeadramon").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 4);
    expect(s.state.memory).toBe(4);

    await advance(s.engine).verb.unsuspend([attackerId]);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.perm("waruSeadramon").isSuspended);
    expect(s.state.memory).toBe(4);

    const turnAfterSecondAttack = s.state.turnCount;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnCount).toBeGreaterThan(turnAfterSecondAttack);

    await advance(s.engine).verb.unsuspend([attackerId]);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.perm("waruSeadramon").isSuspended);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("thirdPlayed").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });
});

describe("BT15-078 WaruSeadramon — KB Q&A rulings", () => {
  it("keeps the declared attack target when the opponent's trash has no level 4 or lower Digimon (Q2570)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-078", as: "waruSeadramon" }], deck: ["BT1-009", "BT1-009"] },
        1: {
          battleArea: [{ card: "BT1-009", as: "declaredTarget", suspended: true }],
          trash: [
            { card: "EX5-040", as: "levelFiveInTrash" },
            { card: "BT15-098", as: "optionInTrash" },
          ],
          security: 2,
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("waruSeadramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("declaredTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("declaredTarget").instanceId),
    );

    const opponent = s.state.players[1]!;
    expect(opponent.battleArea).toHaveLength(0);
    expect(opponent.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("levelFiveInTrash").instanceId,
        s.inst("optionInTrash").instanceId,
        s.inst("declaredTarget").instanceId,
      ]),
    );
    expect(opponent.security).toHaveLength(2);
    expect(s.state.memory).toBe(3);
  });

  it("does not activate [All Turns] when an effect plays an opponent's Digimon into the breeding area (Q2571)", async () => {
    const opponentEffectPlays = [
      { enabler: "EX5-040", played: "BT10-079", intoBreeding: true, memoryLost: 0 },
      { enabler: "BT1-056", played: "BT1-047", intoBreeding: false, memoryLost: 1 },
    ];
    for (const { enabler, played, intoBreeding, memoryLost } of opponentEffectPlays) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT15-078", as: "waruSeadramon", suspended: true }],
            deck: ["BT1-009", "BT1-009"],
          },
          1: {
            hand: [
              { card: enabler, as: "enabler" },
              { card: played, as: "playedByOpponentEffect" },
            ],
            battleArea: [{ card: "BT1-009", as: "doomedAttacker" }],
            deck: ["BT1-010", "BT1-011", "BT1-012"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      s.state.memory = 10;
      await s.ready();
      const playedId = s.inst("playedByOpponentEffect").instanceId;
      const opponent = s.state.players[1]!;
      const landed = (): boolean =>
        intoBreeding
          ? opponent.breeding?.topCard?.instanceId === playedId
          : opponent.battleArea.some((permanent) => permanent.topCard?.instanceId === playedId);

      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("enabler").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision === undefined && landed());
      expect(landed()).toBe(true);
      const memoryBeforeDeletion = s.state.memory;

      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("doomedAttacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("waruSeadramon").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          opponent.trash.some(({ instanceId }) => instanceId === s.inst("doomedAttacker").instanceId),
      );

      expect(opponent.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("doomedAttacker").instanceId);
      expect({ intoBreeding, memoryLost: memoryBeforeDeletion - s.state.memory }).toEqual({ intoBreeding, memoryLost });
    }
  });

  it("activates [All Turns] when your own effect plays an opponent's Digimon (Q2572)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-078", as: "waruSeadramon" }], deck: ["BT1-009", "BT1-009"] },
        1: {
          trash: [{ card: "BT1-009", as: "playedByMyEffect" }],
          security: 2,
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("waruSeadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("playedByMyEffect").instanceId),
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.memory).toBe(4);
  });
});
