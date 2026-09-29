import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT6-050.js";
import "../BT1/BT1-064.js";
import "../BT1/BT1-088.js";
import "../BT7/BT7-089.js";
import "../BT13/BT13-007.js";
import "../BT13/BT13-100.js";
import "../BT18/BT18-090.js";

describe("BT6-050 Petaldramon", () => {
  it("digivolves onto a green Tamer and has Piercing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-088", as: "tamer" }],
        hand: [{ card: "BT6-050", as: "petaldramon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("petaldramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT6-050" && s.state.memory === 0);
    await s.engine.recomputeContinuousEffects();

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasPierce(s.perm("tamer"))).toBe(true);
  });

  it("does not use its Green-Tamer Hybrid evolution on a non-green Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "redTamer" }],
        hand: [{ card: "BT6-050", as: "petaldramon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redTamer").permanentId,
        instanceId: s.inst("petaldramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("redTamer").topCard.cardId).toBe("BT1-085");
  });
});

describe("BT6-050 Petaldramon — KB Q&A rulings", () => {
  const digivolveOnto = (s: EngineSetup, tamerAlias: string) =>
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(tamerAlias).permanentId,
      instanceId: s.inst("petaldramon").instanceId,
    });

  const digivolveAndSettle = async (s: EngineSetup, tamerAlias: string) => {
    expect(digivolveOnto(s, tamerAlias)).toEqual({ ok: true });
    await settle(() => s.perm(tamerAlias).topCard?.cardId === "BT6-050" && !observe(s.engine).isAttacking());
  };

  const attack = (s: EngineSetup, attackerAlias: string, target: { kind: "player" } | string) =>
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target: typeof target === "string" ? { kind: "permanent", permanentId: s.perm(target).permanentId } : target,
    });

  it.fails("treats the Tamer as a digivolving Digimon for would-digivolve, digivolves, and can't-digivolve effects (Q1441)", async () => {
    const wouldDigivolve = setupEngine({
      0: {
        battleArea: [{ card: "BT7-089", as: "jp" }],
        hand: [{ card: "BT6-050", as: "petaldramon" }],
        deck: ["BT1-010"],
      },
    });
    wouldDigivolve.state.memory = 3;
    await wouldDigivolve.ready();
    await digivolveAndSettle(wouldDigivolve, "jp");
    expect(wouldDigivolve.state.memory).toBe(1);

    const setupWithYoshino = (base: string) =>
      setupEngine(
        {
          0: {
            battleArea: [
              { card: base, as: "base" },
              { card: "BT13-100", as: "yoshino" },
            ],
            hand: [{ card: "BT6-050", as: "petaldramon" }],
            deck: ["BT1-010"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

    const yoshinoOnDigimon = setupWithYoshino("BT1-064");
    yoshinoOnDigimon.state.memory = 3;
    await yoshinoOnDigimon.ready();
    expect(digivolveOnto(yoshinoOnDigimon, "base")).toEqual({ ok: true });
    await settle(() => yoshinoOnDigimon.perm("yoshino").isSuspended && yoshinoOnDigimon.state.memory === 1);

    const whenDigivolves = setupWithYoshino("BT1-088");
    whenDigivolves.state.memory = 3;
    await whenDigivolves.ready();
    expect(digivolveOnto(whenDigivolves, "base")).toEqual({ ok: true });
    await settle(() => whenDigivolves.perm("yoshino").isSuspended && whenDigivolves.state.memory === 1);
    expect(whenDigivolves.perm("base").topCard?.cardId).toBe("BT6-050");
    expect(whenDigivolves.perm("yoshino").isSuspended).toBe(true);
    expect(whenDigivolves.state.memory).toBe(1);

    const setupWithKingDrasil = (base: string) =>
      setupEngine({
        0: {
          battleArea: [{ card: base, as: "base" }],
          breeding: { card: "BT13-007", as: "kingDrasil" },
          hand: [{ card: "BT6-050", as: "petaldramon" }],
          deck: ["BT1-010"],
        },
      });

    const kingDrasilOnDigimon = setupWithKingDrasil("BT1-064");
    kingDrasilOnDigimon.state.memory = 3;
    await kingDrasilOnDigimon.ready();
    expect(digivolveOnto(kingDrasilOnDigimon, "base")).toMatchObject({ ok: false });

    const cantDigivolve = setupWithKingDrasil("BT1-088");
    cantDigivolve.state.memory = 3;
    await cantDigivolve.ready();
    expect(digivolveOnto(cantDigivolve, "base")).toMatchObject({ ok: false });
    expect(cantDigivolve.perm("base").topCard?.cardId).toBe("BT1-088");
    expect(cantDigivolve.state.memory).toBe(3);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q1442)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-088", as: "tamer" }],
        hand: [{ card: "BT6-050", as: "petaldramon" }],
        deck: [{ card: "BT1-010", as: "bonusDraw" }, "BT1-011"],
      },
    });
    s.state.memory = 3;

    await digivolveAndSettle(s, "tamer");

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a Tamer played this turn (Q1443)", async () => {
    const setupOnTamer = (enteredThisTurn: boolean) =>
      setupEngine({
        0: {
          battleArea: [{ card: "BT1-088", as: "tamer", enteredThisTurn }],
          hand: [{ card: "BT6-050", as: "petaldramon" }],
          deck: ["BT1-010"],
        },
        1: { security: ["BT1-010"], deck: ["BT1-011"] },
      });

    const freshTamer = setupOnTamer(true);
    freshTamer.state.memory = 3;
    await digivolveAndSettle(freshTamer, "tamer");
    expect(attack(freshTamer, "tamer", { kind: "player" })).toMatchObject({ ok: false });
    expect(observe(freshTamer.engine).hasAttackedThisTurn(freshTamer.perm("tamer"))).toBe(false);
    expect(freshTamer.state.players[1]!.security).toHaveLength(1);

    const establishedTamer = setupOnTamer(false);
    establishedTamer.state.memory = 3;
    await digivolveAndSettle(establishedTamer, "tamer");
    expect(attack(establishedTamer, "tamer", { kind: "player" })).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves play (Q1444)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-088", as: "tamer" }],
        hand: [{ card: "BT6-050", as: "petaldramon" }],
        deck: ["BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "wall", dp: 12000, suspended: true }], deck: ["BT1-011"] },
    });
    s.state.memory = 3;
    const tamerInstanceId = s.perm("tamer").topCard!.instanceId;
    const petaldramonPermanentId = s.perm("tamer").permanentId;

    await digivolveAndSettle(s, "tamer");
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toContain(tamerInstanceId);

    expect(attack(s, "tamer", "wall")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === tamerInstanceId));

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === petaldramonPermanentId)).toBe(
      false,
    );
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT1-088", "BT6-050"]);
  });

  it("does not gain the [Security] effect of a Tamer among its digivolution cards (Q1445)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-089", as: "jp" }],
          hand: [{ card: "BT6-050", as: "petaldramon" }],
          deck: ["BT1-010"],
        },
        1: { security: [{ card: "BT7-089", as: "opponentJp" }], deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const ownJpInstanceId = s.perm("jp").topCard!.instanceId;
    await digivolveAndSettle(s, "jp");

    expect(attack(s, "jp", { kind: "player" })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT7-089") &&
        !observe(s.engine).isAttacking(),
    );

    const securityTriggers = s.events.filter(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT7-089" && event.timing === "Security",
    );
    expect(securityTriggers.map((event) => (event as { seat: number }).seat)).toEqual([1]);
    expect(s.perm("jp").stack.map(({ instanceId }) => instanceId)).toContain(ownJpInstanceId);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT7-089")).toHaveLength(0);
  });

  it("cannot decline a declared Tamer digivolution, and cannot declare one without a legal base on the field (Q4638)", async () => {
    const declared = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-088", as: "tamer" }],
          hand: [{ card: "BT6-050", as: "petaldramon" }],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, declineDigiXros: true },
    );
    declared.state.memory = 3;
    await digivolveAndSettle(declared, "tamer");
    const declinableRequests = declared.decisions.filter(
      ({ seat, req }) => seat === 0 && (req.kind === "optional" || req.options?.declineIndex !== undefined),
    );
    expect(declinableRequests).toEqual([]);
    expect(declared.perm("tamer").topCard?.instanceId).toBe(declared.inst("petaldramon").instanceId);
    expect(declared.state.memory).toBe(0);

    const noLegalBase = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-010", as: "redDigimon" },
          { card: "BT1-085", as: "redTamer" },
        ],
        hand: [{ card: "BT6-050", as: "petaldramon" }],
        deck: ["BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-088", as: "opponentGreenTamer" }], deck: ["BT1-011"] },
    });
    noLegalBase.state.memory = 3;
    for (const alias of ["redDigimon", "redTamer", "opponentGreenTamer"]) {
      expect(
        noLegalBase.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: noLegalBase.perm(alias).permanentId,
          instanceId: noLegalBase.inst("petaldramon").instanceId,
        }),
      ).toMatchObject({ ok: false });
    }
    expect(noLegalBase.perm("redDigimon").topCard?.cardId).toBe("BT1-010");
    expect(noLegalBase.perm("redTamer").topCard?.cardId).toBe("BT1-085");
    expect(noLegalBase.perm("opponentGreenTamer").topCard?.cardId).toBe("BT1-088");
    expect(noLegalBase.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT6-050"]);
    expect(noLegalBase.state.memory).toBe(3);
  });

  it("gains the inherited effect of a Tamer among its digivolution cards (Q1446)", async () => {
    const setupOnTamer = (tamer: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: tamer, as: "tamer" }],
            hand: [
              { card: "BT6-050", as: "petaldramon" },
              { card: "BT7-089", as: "handTamer" },
            ],
            deck: ["BT1-010"],
          },
          1: { battleArea: [{ card: "BT1-010", as: "victim", suspended: true }], deck: ["BT1-011"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      return s;
    };
    const attackAndDelete = async (s: EngineSetup) => {
      const victimInstanceId = s.perm("victim").topCard!.instanceId;
      await digivolveAndSettle(s, "tamer");
      expect(attack(s, "tamer", "victim")).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[1]!.trash.some(({ instanceId }) => instanceId === victimInstanceId) &&
          !observe(s.engine).isAttacking(),
      );
    };

    const onZoe = setupOnTamer("BT18-090");
    await attackAndDelete(onZoe);
    expect(onZoe.state.players[0]!.battleArea.map(({ topCard }) => topCard?.instanceId)).toContain(
      onZoe.inst("handTamer").instanceId,
    );

    const onIzzy = setupOnTamer("BT1-088");
    await attackAndDelete(onIzzy);
    expect(onIzzy.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      onIzzy.inst("handTamer").instanceId,
    );
  });
});
