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
import "./BT4-027.js";

const FILLER = ["BT1-009", "BT1-009", "BT1-009"];

function digivolveKendo(s: EngineSetup, baseAlias: string, kendoAlias = "kendo") {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(baseAlias).permanentId,
    instanceId: s.inst(kendoAlias).instanceId,
  });
}

describe("BT4-027 KendoGarurumon", () => {
  it("digivolves from hand onto a blue Tamer for 3 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT4-027", as: "kendo" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("kendo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT4-027" && s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT4-027");
  });

  it("cannot use a non-blue Tamer as its alternate digivolution base", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-085", as: "tamer" }], hand: [{ card: "BT4-027", as: "kendo" }] },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("kendo").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("tamer").topCard?.cardId).toBe("BT1-085");
  });

  it("returns a level 3 Digimon and trashes all of that Digimon's sources when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-027", as: "kendo" }] },
        1: {
          battleArea: [
            {
              card: "BT1-009",
              as: "target",
              under: [
                { card: "BT1-001", as: "bottom" },
                { card: "BT2-001", as: "top" },
              ],
            },
          ],
          security: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const sourceIds = [s.inst("bottom").instanceId, s.inst("top").instanceId];

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kendo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009"));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    expect(sourceIds.every((id) => s.state.players[1]!.trash.some((card) => card.instanceId === id))).toBe(true);
  });

  it("does not return an opposing level 4 Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-027", as: "kendo" }] },
      1: {
        battleArea: [{ card: "BT1-019", as: "target", under: [{ card: "BT1-001", as: "source" }] }],
        security: ["BT1-010"],
      },
    });
    const targetId = s.perm("target").permanentId;
    const sourceId = s.inst("source").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kendo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
    expect(s.perm("target").stack.some((card) => card.instanceId === sourceId)).toBe(true);
  });
});

describe("BT4-027 KendoGarurumon — KB Q&A rulings", () => {
  it("treats the Tamer as a digivolving Digimon for can't-digivolve locks and digivolve triggers (Q1188)", async () => {
    const locked = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [
          { card: "BT1-086", as: "tamer" },
          { card: "BT1-029", as: "rookie" },
        ],
        hand: [
          { card: "BT4-027", as: "kendo" },
          { card: "BT4-027", as: "controlKendo" },
        ],
        deck: [...FILLER],
      },
    });
    locked.state.memory = 4;
    await locked.ready();

    expect(digivolveKendo(locked, "rookie", "controlKendo")).toMatchObject({ ok: false });
    expect(digivolveKendo(locked, "tamer")).toMatchObject({ ok: false });
    expect(locked.perm("tamer").topCard?.cardId).toBe("BT1-086");
    expect(locked.state.memory).toBe(4);

    const triggered = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-086", as: "tamer" },
            { card: "BT16-085", as: "watcher" },
          ],
          hand: [{ card: "BT4-027", as: "kendo" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    triggered.state.memory = 4;
    await triggered.ready();

    const control = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "rookie" },
            { card: "BT16-085", as: "watcher" },
          ],
          hand: [{ card: "BT4-027", as: "kendo" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.memory = 4;
    await control.ready();
    expect(digivolveKendo(control, "rookie")).toEqual({ ok: true });
    await settle(() => control.perm("rookie").topCard?.cardId === "BT4-027");
    await settle();
    expect(control.perm("watcher").isSuspended).toBe(true);
    expect(control.state.memory).toBe(2);

    expect(digivolveKendo(triggered, "tamer")).toEqual({ ok: true });
    await settle(() => triggered.perm("tamer").topCard?.cardId === "BT4-027");
    await settle();

    expect(triggered.perm("watcher").isSuspended).toBe(true);
    expect(triggered.state.memory).toBe(2);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q1189)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT4-027", as: "kendo" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(digivolveKendo(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("tamer").topCard?.cardId).toBe("BT4-027");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
  });

  it("can't attack the turn it digivolves from a Tamer played that same turn (Q1190)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "establishedTamer" }],
        hand: [
          { card: "BT1-086", as: "freshTamer" },
          { card: "BT4-027", as: "kendo" },
          { card: "BT4-027", as: "establishedKendo" },
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
        instanceId: s.inst("kendo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => freshPermanent().topCard?.instanceId === s.inst("kendo").instanceId);
    expect(digivolveKendo(s, "establishedTamer", "establishedKendo")).toEqual({ ok: true });
    await settle(() => s.perm("establishedTamer").topCard?.cardId === "BT4-027");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: freshPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(freshPermanent().isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("establishedTamer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves play (Q1191)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT4-027", as: "kendo" }],
        deck: [...FILLER],
      },
    });
    s.state.memory = 4;
    await s.ready();
    const tamerInstanceId = s.perm("tamer").topCard!.instanceId;

    expect(digivolveKendo(s, "tamer")).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT4-027");
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([tamerInstanceId]);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId])).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([tamerInstanceId, s.inst("kendo").instanceId]),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q1192)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-027", as: "host", under: [{ card: "BT7-087", as: "stackedKoji" }] }],
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
    expect(s.perm("host").topCard?.cardId).toBe("BT4-027");
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("stackedKoji").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q1193)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: [{ card: "BT4-027", as: "kendo" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(digivolveKendo(s, "koji")).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.cardId === "BT4-027");
    await settle();
    const memoryAfterDigivolve = s.state.memory;
    expect(observe(s.engine).isRestricted(s.perm("koji"), "cantBeBlocked")).toBe(false);

    await advance(s.engine).verb.drawByEffect(0, 1);
    await settle(() => s.state.memory === memoryAfterDigivolve + 1);

    expect(s.state.memory).toBe(memoryAfterDigivolve + 1);
    expect(observe(s.engine).isRestricted(s.perm("koji"), "cantBeBlocked")).toBe(true);
  });

  it("can't declare the digivolution without a valid base, and once declared it resolves with no option to decline (Q4636)", async () => {
    const noBase = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "redTamer" }],
        hand: [{ card: "BT4-027", as: "kendo" }],
        deck: [...FILLER],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opposingRookie" }] },
    });
    noBase.state.memory = 4;
    await noBase.ready();

    expect(digivolveKendo(noBase, "redTamer")).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(digivolveKendo(noBase, "opposingRookie")).toEqual({ ok: false, reason: "no-such-permanent" });
    expect(noBase.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([noBase.inst("kendo").instanceId]);
    expect(noBase.perm("redTamer").topCard?.cardId).toBe("BT1-085");
    expect(noBase.state.memory).toBe(4);

    const declared = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "blueTamer" }],
        hand: [{ card: "BT4-027", as: "kendo" }],
        deck: [...FILLER],
      },
    });
    declared.state.memory = 4;
    await declared.ready();

    expect(digivolveKendo(declared, "blueTamer")).toEqual({ ok: true });
    expect(declared.state.pendingDecision).toBeUndefined();
    await settle(() => declared.perm("blueTamer").topCard?.cardId === "BT4-027");

    expect(declared.state.pendingDecision).toBeUndefined();
    expect(declared.perm("blueTamer").stack.map((card) => card.cardId)).toEqual(["BT1-086"]);
    expect(declared.state.players[0]!.hand.some((card) => card.instanceId === declared.inst("kendo").instanceId)).toBe(
      false,
    );
    expect(declared.state.memory).toBe(1);
  });
});
