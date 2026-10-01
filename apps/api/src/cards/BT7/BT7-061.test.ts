import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT1/BT1-009.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-088.js";
import "../BT18/BT18-013.js";
import "../BT18/BT18-091.js";
import "../BT18/BT18-094.js";
import "../BT2/BT2-052.js";
import "../BT2/BT2-089.js";
import "./BT7-061.js";

const FILLER = ["BT1-009", "BT1-009", "BT1-009"];

function digivolveGigasmon(s: EngineSetup, baseAlias: string, gigasmonAlias = "gigas") {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(baseAlias).permanentId,
    instanceId: s.inst(gigasmonAlias).instanceId,
  });
}

function attackPlayer(s: EngineSetup, attackerAlias: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm(attackerAlias).permanentId,
    target: { kind: "player" },
  });
}

describe("BT7-061 Gigasmon", () => {
  it("records black Tamer eligibility and separates the active Blocker grant", () => {
    const card = runtimeCompiledCard("BT7-061");
    expect(card).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ baseIsTamer: true, baseColors: ["Black"] }],
      effects: [
        {
          trigger: "Static",
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Black"] }, count: 1 },
              payCost: true,
              asLevel: 3,
              from: ["hand"],
            },
          ],
        },
        {
          trigger: "AllTurns",
          actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } } }],
        },
        { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
      ],
    });
  });

  it("digivolves onto a black Tamer and has Blocker", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-089", as: "tamer" }],
        hand: [{ card: "BT7-061", as: "gigas" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("gigas").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-061" && s.state.memory === 0);
    await s.engine.recomputeContinuousEffects();

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("tamer"), "Blocker")).toBe(true);
  });
});

describe("BT7-061 Gigasmon — KB Q&A rulings", () => {
  it("treats the Tamer as a digivolving Digimon for digivolve triggers and can't-digivolve locks (Q1614)", async () => {
    const control = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "rookie" },
            { card: "BT16-088", as: "watcher" },
          ],
          hand: [{ card: "BT7-061", as: "gigas" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.memory = 4;
    await control.ready();
    expect(digivolveGigasmon(control, "rookie")).toEqual({ ok: true });
    await settle(() => control.perm("rookie").topCard?.cardId === "BT7-061");
    await drainMicrotasks();
    expect(control.perm("watcher").isSuspended).toBe(true);
    expect(control.state.memory).toBe(2);

    const triggered = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-089", as: "tamer" },
            { card: "BT16-088", as: "watcher" },
          ],
          hand: [{ card: "BT7-061", as: "gigas" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    triggered.state.memory = 4;
    await triggered.ready();

    expect(digivolveGigasmon(triggered, "tamer")).toEqual({ ok: true });
    await settle(() => triggered.perm("tamer").topCard?.cardId === "BT7-061");
    await drainMicrotasks();

    expect(triggered.perm("watcher").isSuspended).toBe(true);
    expect(triggered.state.memory).toBe(2);

    const locked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [
          { card: "BT2-089", as: "tamer" },
          { card: "BT2-052", as: "rookie" },
        ],
        hand: [
          { card: "BT7-061", as: "gigas" },
          { card: "BT7-061", as: "controlGigas" },
        ],
        deck: [...FILLER],
      },
    });
    locked.state.memory = 4;
    await locked.ready();

    expect(digivolveGigasmon(locked, "rookie", "controlGigas")).toMatchObject({ ok: false });
    expect(digivolveGigasmon(locked, "tamer")).toMatchObject({ ok: false });
    expect(locked.perm("tamer").topCard?.cardId).toBe("BT2-089");
    expect(locked.state.memory).toBe(4);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q1615)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-089", as: "tamer" }],
        hand: [{ card: "BT7-061", as: "gigas" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(digivolveGigasmon(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("tamer").topCard?.cardId).toBe("BT7-061");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
  });

  it("can't attack the turn it digivolves from a Tamer played that same turn (Q1616)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-089", as: "establishedTamer" }],
        hand: [
          { card: "BT2-089", as: "freshTamer" },
          { card: "BT7-061", as: "gigas" },
          { card: "BT7-061", as: "establishedGigas" },
        ],
        deck: [...FILLER],
        security: [...FILLER],
      },
      1: { security: [...FILLER], deck: [...FILLER] },
    });
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("freshTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    const freshPermanentId = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("freshTamer").instanceId,
    )!.permanentId;
    const freshPermanent = () => s.state.players[0]!.battleArea.find((p) => p.permanentId === freshPermanentId)!;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: freshPermanentId,
        instanceId: s.inst("gigas").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => freshPermanent().topCard?.instanceId === s.inst("gigas").instanceId);
    expect(digivolveGigasmon(s, "establishedTamer", "establishedGigas")).toEqual({ ok: true });
    await settle(() => s.perm("establishedTamer").topCard?.cardId === "BT7-061");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: freshPermanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(freshPermanent().isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(FILLER.length);

    expect(attackPlayer(s, "establishedTamer")).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves play (Q1617)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-089", as: "tamer" }],
        hand: [{ card: "BT7-061", as: "gigas" }],
        deck: [...FILLER],
      },
    });
    s.state.memory = 4;
    await s.ready();
    const tamerInstanceId = s.perm("tamer").topCard!.instanceId;

    expect(digivolveGigasmon(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-061");
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([tamerInstanceId]);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId])).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([tamerInstanceId, s.inst("gigas").instanceId]),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q1618)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-061", as: "host", under: [{ card: "BT2-089", as: "stackedTai" }] }],
          security: [{ card: "BT2-089", as: "securityTai" }],
          deck: [...FILLER],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && s.state.players[0]!.battleArea.length === 2);
    await advance(s.engine).finishAttack();

    expect(s.perm("securityTai").topCard?.instanceId).toBe(s.inst("securityTai").instanceId);
    expect(s.perm("host").topCard?.cardId).toBe("BT7-061");
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("stackedTai").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q1619)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-091", as: "jp" },
            { card: "BT18-013", as: "raidOne" },
            { card: "BT18-013", as: "raidTwo" },
          ],
          hand: [
            { card: "BT7-061", as: "gigas" },
            { card: "BT18-094", as: "koichi" },
          ],
          deck: [...FILLER],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "defenderOne", dp: 1000 },
            { card: "BT1-009", as: "defenderTwo", dp: 900 },
          ],
          security: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const defenderOneId = s.perm("defenderOne").permanentId;
    const koichiOnField = () =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("koichi").instanceId);

    expect(attackPlayer(s, "raidOne")).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === defenderOneId));
    await drainMicrotasks();
    expect(koichiOnField()).toBe(false);

    expect(digivolveGigasmon(s, "jp")).toEqual({ ok: true });
    await settle(() => s.perm("jp").topCard?.cardId === "BT7-061");
    expect(s.perm("jp").stack.map((card) => card.cardId)).toEqual(["BT18-091"]);

    expect(attackPlayer(s, "raidTwo")).toEqual({ ok: true });
    await settle(koichiOnField);

    expect(koichiOnField()).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("koichi").instanceId)).toBe(false);
  });

  it("can't back out of a declared Tamer digivolution and can't declare one without a valid black Tamer (Q4648)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-085", as: "redTamer" },
            { card: "BT2-089", as: "blackTamer" },
          ],
          hand: [
            { card: "BT7-061", as: "gigas" },
            { card: "BT7-061", as: "spareGigas" },
          ],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(digivolveGigasmon(s, "redTamer", "spareGigas")).toMatchObject({ ok: false });
    await drainMicrotasks();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("redTamer").topCard?.cardId).toBe("BT1-085");
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("spareGigas").instanceId);

    expect(digivolveGigasmon(s, "blackTamer")).toEqual({ ok: true });
    await settle(() => s.perm("blackTamer").topCard?.cardId === "BT7-061");
    await drainMicrotasks();

    expect(s.perm("blackTamer").topCard?.instanceId).toBe(s.inst("gigas").instanceId);
    expect(s.perm("blackTamer").stack.map((card) => card.cardId)).toEqual(["BT2-089"]);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("gigas").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
