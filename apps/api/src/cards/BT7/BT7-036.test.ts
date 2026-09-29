import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-036.js";
import "./BT7-035.js";
import "./BT7-088.js";
import "../BT1/BT1-024.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-088.js";

describe("BT7-036 Zephyrmon", () => {
  it("digivolves onto a yellow Tamer for the printed fixed cost of 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-088", as: "base" }],
        hand: [{ card: "BT7-036", as: "evolving" }],
        security: [{ card: "BT1-048", as: "security" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).securityDp(0) === 3000);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("BT7-036");
  });

  it("gives all of your Security Digimon +3000 DP through the opponent's next turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-035", under: ["BT7-088"], as: "base" }],
        hand: [{ card: "BT7-036", as: "evolving" }],
        security: [{ card: "BT1-048", as: "security" }],
      },
      1: { battleArea: [{ card: "BT1-014", as: "attacker" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).securityDp(0) === 3000);
    expect(observe(s.engine).securityDp(0)).toBe(3000);
    expect(s.perm("base").currentDP).toBe(6000);
  });
});

describe("BT7-036 Zephyrmon — KB Q&A rulings", () => {
  const digivolveOnto = (s: EngineSetup, baseAlias: string) =>
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(baseAlias).permanentId,
      instanceId: s.inst("zephyrmon").instanceId,
    });

  const digivolveAndSettle = async (s: EngineSetup, baseAlias: string) => {
    expect(digivolveOnto(s, baseAlias)).toEqual({ ok: true });
    await settle(() => s.perm(baseAlias).topCard?.cardId === "BT7-036" && !observe(s.engine).isAttacking());
  };

  const attack = (s: EngineSetup, attackerAlias: string, target: { kind: "player" } | string) =>
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target: typeof target === "string" ? { kind: "permanent", permanentId: s.perm(target).permanentId } : target,
    });

  it.fails("treats the Tamer as a digivolving Digimon for digivolves and can't-digivolve effects (Q1559)", async () => {
    const whenDigivolves = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-088", as: "zoe" },
            { card: "BT16-088", as: "codyAndTk" },
          ],
          hand: [{ card: "BT7-036", as: "zephyrmon" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    whenDigivolves.state.memory = 2;
    await whenDigivolves.ready();
    expect(digivolveOnto(whenDigivolves, "zoe")).toEqual({ ok: true });
    await settle(() => whenDigivolves.perm("codyAndTk").isSuspended && whenDigivolves.state.memory === 1);
    expect(whenDigivolves.perm("zoe").topCard?.cardId).toBe("BT7-036");
    expect(whenDigivolves.perm("codyAndTk").isSuspended).toBe(true);
    expect(whenDigivolves.state.memory).toBe(1);

    const cantDigivolve = setupEngine({
      0: {
        battleArea: [{ card: "BT7-088", as: "zoe" }],
        breeding: { card: "BT13-007", as: "kingDrasil" },
        hand: [{ card: "BT7-036", as: "zephyrmon" }],
        deck: ["BT1-010"],
      },
    });
    cantDigivolve.state.memory = 2;
    await cantDigivolve.ready();
    expect(digivolveOnto(cantDigivolve, "zoe")).toMatchObject({ ok: false });
    expect(cantDigivolve.perm("zoe").topCard?.cardId).toBe("BT7-088");
    expect(cantDigivolve.state.memory).toBe(2);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q1560)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-088", as: "zoe" }],
        hand: [{ card: "BT7-036", as: "zephyrmon" }],
        deck: [{ card: "BT1-010", as: "bonusDraw" }, "BT1-011"],
      },
    });
    s.state.memory = 2;

    await digivolveAndSettle(s, "zoe");

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a Tamer played this turn (Q1561)", async () => {
    const setupOnZoe = (enteredThisTurn: boolean) =>
      setupEngine({
        0: {
          battleArea: [{ card: "BT7-088", as: "zoe", enteredThisTurn }],
          hand: [{ card: "BT7-036", as: "zephyrmon" }],
          deck: ["BT1-010"],
        },
        1: { security: ["BT1-010"], deck: ["BT1-011"] },
      });

    const freshZoe = setupOnZoe(true);
    freshZoe.state.memory = 2;
    await digivolveAndSettle(freshZoe, "zoe");
    expect(attack(freshZoe, "zoe", { kind: "player" })).toMatchObject({ ok: false });
    expect(observe(freshZoe.engine).hasAttackedThisTurn(freshZoe.perm("zoe"))).toBe(false);
    expect(freshZoe.state.players[1]!.security).toHaveLength(1);

    const establishedZoe = setupOnZoe(false);
    establishedZoe.state.memory = 2;
    await digivolveAndSettle(establishedZoe, "zoe");
    expect(attack(establishedZoe, "zoe", { kind: "player" })).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves play (Q1562)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-088", as: "zoe" }],
        hand: [{ card: "BT7-036", as: "zephyrmon" }],
        deck: ["BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "wall", dp: 12000, suspended: true }], deck: ["BT1-011"] },
    });
    s.state.memory = 2;
    const zoeInstanceId = s.perm("zoe").topCard!.instanceId;
    const zephyrmonPermanentId = s.perm("zoe").permanentId;

    await digivolveAndSettle(s, "zoe");
    expect(s.perm("zoe").stack.map(({ instanceId }) => instanceId)).toEqual([zoeInstanceId]);

    expect(attack(s, "zoe", "wall")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === zoeInstanceId));

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === zephyrmonPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT7-036", "BT7-088"]);
  });

  it("does not gain the [Security] effect of a Tamer among its digivolution cards (Q1563)", async () => {
    // BT7-088's IR has no [Security] clause, so BT16-088 stands in as the yellow Tamer that has one.
    const checkOwnSecurity = async (securityCard: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT7-036", as: "zephyrmon", under: [{ card: "BT16-088", as: "tamerUnder" }] }],
            security: [securityCard],
            deck: ["BT1-010"],
          },
          1: { battleArea: [{ card: "BT1-014", as: "opponentAttacker" }], deck: ["BT1-011"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("opponentAttacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking(),
      );
      const tamerSecurityTriggers = s.events.filter(
        (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT16-088" && event.timing === "Security",
      );
      const playedTamers = s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT16-088");
      return { s, tamerSecurityTriggers, playedTamers };
    };

    const tamerOnlyUnderZephyrmon = await checkOwnSecurity("BT1-045");
    expect(tamerOnlyUnderZephyrmon.tamerSecurityTriggers).toHaveLength(0);
    expect(tamerOnlyUnderZephyrmon.playedTamers).toHaveLength(0);
    expect(tamerOnlyUnderZephyrmon.s.perm("zephyrmon").stack.map(({ instanceId }) => instanceId)).toEqual([
      tamerOnlyUnderZephyrmon.s.inst("tamerUnder").instanceId,
    ]);

    const tamerRevealedFromSecurity = await checkOwnSecurity("BT16-088");
    expect(tamerRevealedFromSecurity.tamerSecurityTriggers).toHaveLength(1);
    expect(tamerRevealedFromSecurity.playedTamers).toHaveLength(1);
  });

  it("gains the inherited effect of a Tamer among its digivolution cards (Q1564)", async () => {
    const setupOnOpponentsTurn = (source: string) =>
      setupEngine({
        0: {
          battleArea: [{ card: "BT7-036", as: "zephyrmon", under: [source] }],
          security: ["BT1-048"],
        },
      });

    const overZoe = setupOnOpponentsTurn("BT7-088");
    overZoe.state.turnSeat = 1;
    await overZoe.ready();
    expect(observe(overZoe.engine).securityDp(0)).toBe(3000);

    const overKazemon = setupOnOpponentsTurn("BT7-035");
    overKazemon.state.turnSeat = 1;
    await overKazemon.ready();
    expect(observe(overKazemon.engine).securityDp(0)).toBe(0);
  });

  it("trashes the Tamer under it when the Digimon is deleted (Q1565)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-036", as: "zephyrmon", under: [{ card: "BT7-088", as: "zoe" }], suspended: true }],
        deck: ["BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-024", as: "opponentAttacker" }], deck: ["BT1-011"] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const zephyrmonPermanentId = s.perm("zephyrmon").permanentId;
    const zoeInstanceId = s.inst("zoe").instanceId;
    expect(s.perm("zephyrmon").stack.map(({ instanceId }) => instanceId)).toEqual([zoeInstanceId]);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentAttacker").permanentId,
        target: { kind: "permanent", permanentId: zephyrmonPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === zoeInstanceId));

    const me = s.state.players[0]!;
    expect(me.battleArea.some(({ permanentId }) => permanentId === zephyrmonPermanentId)).toBe(false);
    expect(me.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT7-036", "BT7-088"]);
    expect(me.hand).toHaveLength(0);
    expect(me.battleArea).toHaveLength(0);
  });

  it("commits to the digivolution once declared and can't be declared without a valid base (Q4644)", async () => {
    const setupWithBase = (battleArea: { card: string; as: string }[]) =>
      setupEngine({
        0: {
          battleArea,
          hand: [{ card: "BT7-036", as: "zephyrmon" }],
          deck: ["BT1-010"],
        },
      });

    const redTamerOnly = setupWithBase([{ card: "BT1-085", as: "redTamer" }]);
    redTamerOnly.state.memory = 2;
    await redTamerOnly.ready();
    expect(digivolveOnto(redTamerOnly, "redTamer")).toMatchObject({ ok: false });
    expect(redTamerOnly.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT7-036"]);
    expect(redTamerOnly.perm("redTamer").topCard?.cardId).toBe("BT1-085");
    expect(redTamerOnly.state.memory).toBe(2);

    const yellowTamer = setupWithBase([{ card: "BT7-088", as: "zoe" }]);
    yellowTamer.state.memory = 2;
    await yellowTamer.ready();
    await digivolveAndSettle(yellowTamer, "zoe");
    expect(yellowTamer.state.memory).toBe(0);
    expect(yellowTamer.decisions.filter(({ seat }) => seat === 0)).toEqual([]);
  });
});
