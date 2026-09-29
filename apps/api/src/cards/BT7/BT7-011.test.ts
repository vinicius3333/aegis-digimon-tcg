import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  setupEngine,
  settle,
  type EngineSetup,
  type PermanentSpec,
  type SeatSpec,
} from "../../engine/testkit/harness.js";
import "../BT1/BT1-085.js";
import "../BT12/BT12-088.js";
import "../BT16/BT16-084.js";
import "../EX7/EX7-049.js";
import "./BT7-011.js";

describe("BT7-011 BurningGreymon", () => {
  it("digivolves onto a red Tamer for the printed fixed cost of 2", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-085", as: "base" }], hand: [{ card: "BT7-011", as: "evolving" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
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
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("BT7-011");
  });

  it("deletes a 4000-DP-or-less Digimon when it has a Hybrid source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-008", as: "base" }], hand: [{ card: "BT7-011", as: "evolving" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT7-011"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
});

describe("BT7-011 BurningGreymon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

  const setupTamerDigivolve = (tamer: PermanentSpec, extra: SeatSpec = {}, opponent: SeatSpec = {}) =>
    setupEngine(
      {
        0: {
          ...extra,
          battleArea: [{ ...tamer, as: "base" }, ...(extra.battleArea ?? [])],
          hand: [{ card: "BT7-011", as: "evolving" }],
          deck: extra.deck ?? [...FILLER],
          security: [...FILLER],
        },
        1: { deck: [...FILLER], security: [...FILLER], ...opponent },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

  const digivolveOntoTamer = (s: EngineSetup) =>
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    });

  // Engine gap: a Tamer-onto digivolution is reported as a Tamer digivolving (baseWasDigimon is
  // false), so "when a Digimon digivolves" watchers stay silent and a "Digimon can't digivolve"
  // restriction never matches the Tamer base.
  it.fails("treats the Tamer as a digivolving Digimon, so digivolve triggers fire and can't-digivolve blocks it (Q1507)", async () => {
    const s = setupTamerDigivolve({ card: "BT12-088" }, { battleArea: [{ card: "BT16-084", as: "yolei" }] });
    s.state.memory = 2;
    await s.ready();

    expect(digivolveOntoTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT7-011");
    await settle();

    expect(s.perm("yolei").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);

    const restricted = setupTamerDigivolve(
      { card: "BT12-088" },
      {},
      { battleArea: [{ card: "EX7-049", as: "metallicdramon" }] },
    );
    restricted.state.memory = 2;
    await restricted.ready();
    await advance(restricted.engine).fire(EffectTiming.WhenDigivolving, restricted.perm("metallicdramon"));
    await settle();

    expect(digivolveOntoTamer(restricted)).toMatchObject({ ok: false });
    await settle();
    expect(restricted.perm("base").topCard.cardId).toBe("BT12-088");
    expect(restricted.state.memory).toBe(2);
  });

  it("performs the digivolution bonus draw when a Tamer digivolves (Q1508)", async () => {
    const s = setupTamerDigivolve({ card: "BT12-088" }, { deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER] });
    s.state.memory = 2;
    await s.ready();

    expect(digivolveOntoTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT7-011");
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
  });

  it("cannot attack the turn it digivolves from a Tamer played this turn (Q1509)", async () => {
    const s = setupTamerDigivolve({ card: "BT12-088", enteredThisTurn: true });
    s.state.memory = 2;
    await s.ready();

    expect(digivolveOntoTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT7-011");
    await settle();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[1]!.security).toHaveLength(FILLER.length);

    const established = setupTamerDigivolve({ card: "BT12-088" });
    established.state.memory = 2;
    await established.ready();
    expect(digivolveOntoTamer(established)).toEqual({ ok: true });
    await settle(() => established.perm("base").topCard.cardId === "BT7-011");
    await settle();

    expect(
      established.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: established.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves play (Q1510)", async () => {
    const s = setupTamerDigivolve(
      { card: "BT12-088" },
      {},
      { battleArea: [{ card: "BT1-010", as: "defender", dp: 12000, suspended: true }] },
    );
    s.state.memory = 2;
    await s.ready();
    const tamerInstanceId = s.perm("base").topCard.instanceId;
    const attackerId = s.perm("base").permanentId;

    expect(digivolveOntoTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT7-011");
    await settle();
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([tamerInstanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every(({ permanentId }) => permanentId !== attackerId));

    const trash = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(trash).toContain(tamerInstanceId);
    expect(trash).toContain(s.inst("evolving").instanceId);
  });

  it("does not gain the Security effect of a Tamer in its digivolution cards (Q1511)", async () => {
    const s = setupTamerDigivolve({ card: "BT12-088" }, {}, { security: [{ card: "BT12-088", as: "securityTamer" }] });
    s.state.memory = 2;
    await s.ready();
    const tamerInstanceId = s.perm("base").topCard.instanceId;

    expect(digivolveOntoTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT7-011");
    await settle();

    await advance(s.engine).fireForPermanent(EffectTiming.SecuritySkill, s.perm("base"));
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([tamerInstanceId]);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT12-088");
  });

  it("gains the Inherited effect of a Tamer in its digivolution cards (Q1512)", async () => {
    const s = setupTamerDigivolve({ card: "BT12-088" });
    s.state.memory = 2;
    await s.ready();
    expect(digivolveOntoTamer(s)).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT7-011");
    await s.ready();
    expect(s.perm("base").currentDP).toBe(8000);

    const noInherited = setupTamerDigivolve({ card: "BT1-085" });
    noInherited.state.memory = 2;
    await noInherited.ready();
    expect(digivolveOntoTamer(noInherited)).toEqual({ ok: true });
    await settle(() => noInherited.perm("base").topCard.cardId === "BT7-011");
    await noInherited.ready();
    expect(noInherited.perm("base").currentDP).toBe(6000);
  });

  it("cannot declare the Tamer digivolution without a red Tamer on the field, and a declared one always completes (Q4639)", async () => {
    const noRedTamer = setupEngine({
      0: { battleArea: [{ card: "BT1-086", as: "base" }], hand: [{ card: "BT7-011", as: "evolving" }] },
      1: {},
    });
    noRedTamer.state.memory = 2;
    await noRedTamer.ready();

    expect(digivolveOntoTamer(noRedTamer)).toMatchObject({ ok: false });
    await settle();
    expect(noRedTamer.perm("base").topCard.cardId).toBe("BT1-086");
    expect(noRedTamer.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT7-011"]);
    expect(noRedTamer.state.memory).toBe(2);

    const redTamer = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-088", as: "base" }], hand: [{ card: "BT7-011", as: "evolving" }] },
        1: {},
      },
      { autoDeclineOptional: true },
    );
    redTamer.state.memory = 2;
    await redTamer.ready();

    expect(digivolveOntoTamer(redTamer)).toEqual({ ok: true });
    await settle(() => redTamer.perm("base").topCard.cardId === "BT7-011");
    await settle();
    expect(redTamer.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT12-088"]);
    expect(redTamer.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("BT7-011");
    expect(redTamer.state.memory).toBe(0);
    expect(redTamer.decisions.filter(({ req }) => req.kind === "optional")).toEqual([]);
  });
});
