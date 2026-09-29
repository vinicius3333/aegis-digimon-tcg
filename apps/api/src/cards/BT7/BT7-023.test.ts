import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../BT13/BT13-007.js";
import "../EX4/EX4-003.js";
import "./BT7-023.js";
import "./BT7-086.js";

describe("BT7-023 Korikakumon", () => {
  it("publishes the blue-Tamer evolution path and one shared attack-or-block target", () => {
    const compiled = runtimeCompiledCard("BT7-023");
    const staticDigivolve = compiled?.effects
      .find((effect) => effect.trigger === "Static")
      ?.actions.find((action) => action.kind === "Digivolve");
    expect(staticDigivolve).toMatchObject({
      kind: "Digivolve",
      target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Blue"] }, count: 1 },
      asLevel: 3,
      from: ["hand"],
      costOverride: 2,
    });

    const whenDigivolving = compiled?.effects.find((effect) => effect.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions).toHaveLength(1);
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "attackOrBlock",
      duration: "untilOpponentTurnEnd",
      target: { count: 1 },
    });
  });

  it("digivolves onto a blue Tamer for the printed fixed cost of 2", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-086", as: "base" }], hand: [{ card: "BT7-023", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attack"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("BT7-023");
  });

  it("prevents a source-less opposing Digimon from attacking or blocking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-021", as: "base" }], hand: [{ card: "BT7-023", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }], hand: [{ card: "BT1-001", as: "laterSource" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("target"), "attack") &&
        observe(s.engine).isRestricted(s.perm("target"), "block"),
    );
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);

    await advance(s.engine).verb.placeUnder(s.perm("target").permanentId, [s.inst("laterSource").instanceId]);

    expect(s.perm("target").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);
  });
});

describe("BT7-023 Korikakumon — KB Q&A rulings", () => {
  function digivolveOntoTamer(s: ReturnType<typeof setupEngine>, tamerAlias: string, cardAlias: string) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(tamerAlias).permanentId,
      instanceId: s.inst(cardAlias).instanceId,
    });
  }

  it.fails("treats the Tamer as a Digimon that digivolves, so digivolve watchers fire and can't-digivolve effects stop it (Q1537)", async () => {
    const blocked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [
          { card: "BT1-027", as: "rookie" },
          { card: "BT7-086", as: "tommy" },
        ],
        hand: [
          { card: "BT7-023", as: "rookieKorikakumon" },
          { card: "BT7-023", as: "korikakumon" },
        ],
      },
    });
    blocked.state.memory = 5;
    await blocked.ready();

    expect(digivolveOntoTamer(blocked, "rookie", "rookieKorikakumon")).toMatchObject({ ok: false });
    expect(digivolveOntoTamer(blocked, "tommy", "korikakumon")).toMatchObject({ ok: false });
    expect(blocked.perm("tommy").topCard.cardId).toBe("BT7-086");
    expect(blocked.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT7-023", "BT7-023"]);

    const setupWatched = async (baseCard: string) => {
      const watched = setupEngine(
        {
          0: {
            battleArea: [
              { card: baseCard, as: "base" },
              { card: "BT7-021", as: "watcher", under: ["EX4-003"] },
            ],
            hand: [{ card: "BT7-023", as: "korikakumon" }],
            deck: ["BT1-010", "BT1-011", "BT1-012"],
          },
          1: { battleArea: [{ card: "BT2-047", as: "target" }] },
        },
        { autoSelectCards: true },
      );
      watched.state.memory = 5;
      await watched.ready();
      return watched;
    };

    const fromDigimon = await setupWatched("BT1-027");
    expect(digivolveOntoTamer(fromDigimon, "base", "korikakumon")).toEqual({ ok: true });
    await settle(() => fromDigimon.state.players[0]!.hand.length === 2);
    expect(fromDigimon.state.players[0]!.deck).toHaveLength(1);

    const watched = await setupWatched("BT7-086");
    expect(digivolveOntoTamer(watched, "base", "korikakumon")).toEqual({ ok: true });
    await settle(() => watched.state.players[0]!.hand.length === 2);

    expect(watched.perm("base").topCard.cardId).toBe("BT7-023");
    expect(watched.state.players[0]!.deck).toHaveLength(1);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q1538)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-086", as: "tommy" }],
          hand: [{ card: "BT7-023", as: "korikakumon" }],
          deck: [{ card: "BT1-010", as: "bonusCard" }, "BT1-011"],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(digivolveOntoTamer(s, "tommy", "korikakumon")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.perm("tommy").topCard.cardId).toBe("BT7-023");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusCard").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("can't attack the turn it digivolves from a Tamer played that turn, but can from an earlier Tamer (Q1539)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-086", as: "establishedTommy" }],
          hand: [
            { card: "BT7-086", as: "freshTommy" },
            { card: "BT7-023", as: "freshKorikakumon" },
            { card: "BT7-023", as: "establishedKorikakumon" },
          ],
        },
        1: { security: 3 },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("freshTommy").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    const freshTommy = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("freshTommy").instanceId,
    )!;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: freshTommy.permanentId,
        instanceId: s.inst("freshKorikakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => freshTommy.topCard.cardId === "BT7-023");
    expect(digivolveOntoTamer(s, "establishedTommy", "establishedKorikakumon")).toEqual({ ok: true });
    await settle(() => s.perm("establishedTommy").topCard.cardId === "BT7-023");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: freshTommy.permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(freshTommy.isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("establishedTommy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.perm("establishedTommy").isSuspended).toBe(true);
  });

  it("keeps the Tamer card as a digivolution card that is trashed when the Digimon leaves play (Q1540)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-086", as: "tommy" }],
          hand: [{ card: "BT7-023", as: "korikakumon" }],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    const tommyInstanceId = s.perm("tommy").topCard.instanceId;

    expect(digivolveOntoTamer(s, "tommy", "korikakumon")).toEqual({ ok: true });
    await settle(() => s.perm("tommy").topCard.cardId === "BT7-023");

    const korikakumon = s.perm("tommy");
    expect(korikakumon.stack.map(({ instanceId }) => instanceId)).toEqual([tommyInstanceId]);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.instanceId === tommyInstanceId)).toHaveLength(
      0,
    );

    expect(await advance(s.engine).verb.deletePermanent([korikakumon.permanentId])).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([tommyInstanceId, s.inst("korikakumon").instanceId]),
    );
  });

  it("does not gain the Security effect of a Tamer in its digivolution cards (Q1541)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-019", as: "attacker", dp: 20000 }] },
        1: {
          battleArea: [{ card: "BT7-023", as: "korikakumon", under: [{ card: "BT7-086", as: "sourceTommy" }] }],
          security: [{ card: "BT7-086", as: "securityTommy" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    await settle(() => !observe(s.engine).isAttacking());

    const securityTommy = s.state.players[1]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("securityTommy").instanceId,
    );
    expect(securityTommy).toBeDefined();
    expect(s.perm("korikakumon").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("sourceTommy").instanceId]);
    expect(
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("sourceTommy").instanceId),
    ).toBe(false);
  });

  it("gains the Inherited effect of a Tamer in its digivolution cards (Q1542)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-086", as: "tommy" }],
          hand: [{ card: "BT7-023", as: "korikakumon" }],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "firstTarget" },
            { card: "BT2-047", as: "secondTarget" },
          ],
          security: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds },
    );
    s.state.memory = 2;
    preferInstanceIds.push(s.perm("firstTarget").topCard.instanceId);
    expect(digivolveOntoTamer(s, "tommy", "korikakumon")).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("firstTarget"), "attack"));
    expect(observe(s.engine).isRestricted(s.perm("secondTarget"), "attack")).toBe(false);

    preferInstanceIds.splice(0, preferInstanceIds.length, s.perm("secondTarget").topCard.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tommy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("secondTarget"), "attack"));

    expect(observe(s.engine).isRestricted(s.perm("secondTarget"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("secondTarget"), "block")).toBe(true);
  });

  it("keeps the source-less target unable to attack or block through its turn after it gains a digivolution card (Q1544)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-086", as: "tommy" }],
          hand: [{ card: "BT7-023", as: "korikakumon" }],
          security: 3,
        },
        1: {
          battleArea: [
            { card: "BT1-031", as: "target" },
            { card: "BT1-031", as: "sourcedControl", under: ["BT1-010"] },
          ],
          hand: [{ card: "BT1-001", as: "laterSource" }],
          deck: ["BT1-011", "BT1-012"],
          security: 3,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 2;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(digivolveOntoTamer(s, "tommy", "korikakumon")).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attack"));
    expect(observe(s.engine).isRestricted(s.perm("sourcedControl"), "attack")).toBe(false);

    await advance(s.engine).verb.placeUnder(s.perm("target").permanentId, [s.inst("laterSource").instanceId]);
    expect(s.perm("target").stack).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tommy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("target").permanentId }),
    ).toMatchObject({ ok: false });
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("target").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("sourcedControl").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.perm("sourcedControl").isSuspended).toBe(true);
    await advance(s.engine).finishAttack();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("can't back out of a declared Tamer digivolution, and can't declare one without a legal base (Q4642)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-085", as: "redTamer" },
            { card: "BT7-086", as: "blueTamer" },
          ],
          hand: [{ card: "BT7-023", as: "korikakumon" }],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(digivolveOntoTamer(s, "redTamer", "korikakumon")).toMatchObject({ ok: false });
    expect(s.perm("redTamer").topCard.cardId).toBe("BT1-085");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT7-023"]);
    expect(s.state.memory).toBe(2);

    expect(digivolveOntoTamer(s, "blueTamer", "korikakumon")).toEqual({ ok: true });
    await settle(() => s.perm("blueTamer").topCard.cardId === "BT7-023");

    expect(s.perm("blueTamer").topCard.cardId).toBe("BT7-023");
    expect(s.perm("blueTamer").stack.map(({ cardId }) => cardId)).toEqual(["BT7-086"]);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT7-023")).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.decisions.filter(({ seat, req }) => seat === 0 && req.kind === "optional")).toEqual([]);
  });
});
