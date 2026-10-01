import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-029.js";
import "../BT1/BT1-086.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-085.js";
import "../BT7/BT7-087.js";
import "./BT4-025.js";

const FILLER = ["BT1-009", "BT1-009", "BT1-009"];

function digivolveLobomon(s: EngineSetup, tamerAlias: string, lobomonAlias = "lobo") {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(tamerAlias).permanentId,
    instanceId: s.inst(lobomonAlias).instanceId,
  });
}

function trashIds(s: EngineSetup, seat: 0 | 1): string[] {
  return s.state.players[seat]!.trash.map((card) => card.instanceId);
}

describe("BT4-025 Lobomon", () => {
  it("digivolves from hand onto a blue Tamer for 2 memory and draws the bonus", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-086", as: "tamer" }], hand: [{ card: "BT4-025", as: "lobo" }], deck: ["BT1-001"] },
    });
    s.state.memory = 3;
    const handBefore = s.state.players[0]!.hand.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("lobo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT4-025" && s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT4-025");
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
  });

  it("cannot use a non-blue Tamer as its alternate digivolution base", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-085", as: "tamer" }], hand: [{ card: "BT4-025", as: "lobo" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("lobo").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("tamer").topCard?.cardId).toBe("BT1-085");
  });
});

describe("BT4-025 Lobomon — KB Q&A rulings", () => {
  it("treats the Tamer as a digivolving Digimon for can't-digivolve locks and digivolve triggers (Q1181)", async () => {
    const locked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [
          { card: "BT1-086", as: "tamer" },
          { card: "BT1-029", as: "rookie" },
        ],
        hand: [
          { card: "BT4-025", as: "lobo" },
          { card: "BT4-025", as: "controlLobo" },
        ],
        deck: [...FILLER],
      },
    });
    locked.state.memory = 3;
    await locked.ready();

    expect(digivolveLobomon(locked, "rookie", "controlLobo")).toMatchObject({ ok: false });
    expect(digivolveLobomon(locked, "tamer")).toMatchObject({ ok: false });
    expect(locked.perm("tamer").topCard?.cardId).toBe("BT1-086");
    expect(locked.state.memory).toBe(3);

    const triggered = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-086", as: "tamer" },
            { card: "BT16-085", as: "watcher" },
          ],
          hand: [{ card: "BT4-025", as: "lobo" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    triggered.state.memory = 3;
    await triggered.ready();

    const control = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "rookie" },
            { card: "BT16-085", as: "watcher" },
          ],
          hand: [{ card: "BT4-025", as: "lobo" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.memory = 3;
    await control.ready();
    expect(digivolveLobomon(control, "rookie")).toEqual({ ok: true });
    await settle(() => control.perm("rookie").topCard?.cardId === "BT4-025");
    await settle();
    expect(control.perm("watcher").isSuspended).toBe(true);
    expect(control.state.memory).toBe(2);

    expect(digivolveLobomon(triggered, "tamer")).toEqual({ ok: true });
    await settle(() => triggered.perm("tamer").topCard?.cardId === "BT4-025");
    await settle();

    expect(triggered.perm("watcher").isSuspended).toBe(true);
    expect(triggered.state.memory).toBe(2);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q1182)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT4-025", as: "lobo" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(digivolveLobomon(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("tamer").topCard?.cardId).toBe("BT4-025");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
  });

  it("can't attack the turn it digivolves from a Tamer played that same turn (Q1183)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "establishedTamer" }],
        hand: [
          { card: "BT1-086", as: "freshTamer" },
          { card: "BT4-025", as: "lobo" },
          { card: "BT4-025", as: "establishedLobo" },
        ],
        deck: [...FILLER],
        security: [...FILLER],
      },
      1: { security: [...FILLER], deck: [...FILLER] },
    });
    s.state.memory = 10;
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
        instanceId: s.inst("lobo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => freshPermanent().topCard?.instanceId === s.inst("lobo").instanceId);
    expect(digivolveLobomon(s, "establishedTamer", "establishedLobo")).toEqual({ ok: true });
    await settle(() => s.perm("establishedTamer").topCard?.cardId === "BT4-025");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: freshPermanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(freshPermanent().isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("establishedTamer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves play (Q1184)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT4-025", as: "lobo" }],
        deck: [...FILLER],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const tamerInstanceId = s.perm("tamer").topCard!.instanceId;

    expect(digivolveLobomon(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT4-025");
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([tamerInstanceId]);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId])).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(trashIds(s, 0)).toEqual(expect.arrayContaining([tamerInstanceId, s.inst("lobo").instanceId]));
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q1185)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-025", as: "host", under: [{ card: "BT7-087", as: "stackedKoji" }] }],
          security: [{ card: "BT7-087", as: "securityKoji" }],
          deck: [...FILLER],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
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
    await settle(() => s.state.players[0]!.security.length === 0 && s.state.players[0]!.battleArea.length === 2);
    await advance(s.engine).finishAttack();

    expect(s.perm("securityKoji").topCard?.instanceId).toBe(s.inst("securityKoji").instanceId);
    expect(s.perm("host").topCard?.cardId).toBe("BT4-025");
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("stackedKoji").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q1186)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: [{ card: "BT4-025", as: "lobo" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(digivolveLobomon(s, "koji")).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.cardId === "BT4-025");
    await settle();
    const memoryAfterDigivolve = s.state.memory;
    expect(observe(s.engine).isRestricted(s.perm("koji"), "cantBeBlocked")).toBe(false);

    await advance(s.engine).verb.drawByEffect(0, 1);
    await settle(() => s.state.memory === memoryAfterDigivolve + 1);

    expect(s.state.memory).toBe(memoryAfterDigivolve + 1);
    expect(observe(s.engine).isRestricted(s.perm("koji"), "cantBeBlocked")).toBe(true);
  });

  it("must complete a declared digivolution onto a Tamer and can't declare it without a valid base (Q4635)", async () => {
    const noBase = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "redTamer" }],
        hand: [{ card: "BT4-025", as: "lobo" }],
        deck: [...FILLER],
      },
    });
    noBase.state.memory = 3;
    await noBase.ready();

    expect(digivolveLobomon(noBase, "redTamer")).toMatchObject({ ok: false });
    expect(noBase.perm("redTamer").topCard?.cardId).toBe("BT1-085");
    expect(noBase.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([noBase.inst("lobo").instanceId]);
    expect(noBase.state.memory).toBe(3);

    const declared = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-086", as: "tamer" }],
          hand: [{ card: "BT4-025", as: "lobo" }],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true },
    );
    declared.state.memory = 3;
    await declared.ready();

    expect(digivolveLobomon(declared, "tamer")).toEqual({ ok: true });
    await settle(() => declared.perm("tamer").topCard?.cardId === "BT4-025");
    await settle();

    expect(declared.decisions).toEqual([]);
    expect(declared.perm("tamer").topCard?.instanceId).toBe(declared.inst("lobo").instanceId);
    expect(declared.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT1-086"]);
    expect(declared.state.memory).toBe(1);
  });
});
