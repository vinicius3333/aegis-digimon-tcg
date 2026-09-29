import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-090.js";
import "../BT5/BT5-091.js";

describe("BT4-090 Chaosmon", () => {
  it("has Piercing, unsuspends when digivolving, and attacks an unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-057", as: "base", suspended: true }],
          hand: [{ card: "BT4-090", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT3-019", as: "target", dp: 13_000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.perm("base").isSuspended);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
  });

  it("does not let a normal attack target an unsuspended Digimon after the granted attack ends", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-090", as: "chaos" }] },
      1: { battleArea: [{ card: "BT3-019", as: "unsuspended" }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("chaos").attackablePermanentIds).not.toContain(s.perm("unsuspended").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("chaos").permanentId,
        target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("cannot use its effect-driven attack when the stack was played this turn without Rush", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT3-057", as: "base" },
            { card: "BT4-090", as: "evolving" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("base").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("base").instanceId),
    );
    const base = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("base").instanceId,
    )!;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT4-090"));

    expect(base.topCard?.cardId).toBe("BT4-090");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(base.isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
  });
});

describe("BT4-090 Chaosmon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-009", "BT1-009", "BT1-009"];

  it("still attacks through [When Digivolving] after paying memory onto the opponent's side (Q1240)", async () => {
    const memoryAtEvent = new Map<string, number>();
    const turnSeatAtEvent = new Map<string, number>();
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-057", as: "base", suspended: true }],
          hand: [{ card: "BT4-090", as: "evolving" }],
          deck: [...FILLER],
          security: [...FILLER],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: [...FILLER], security: [...FILLER] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent: (event) => {
          if (!memoryAtEvent.has(event.kind)) memoryAtEvent.set(event.kind, s.state.memory);
          if (!turnSeatAtEvent.has(event.kind)) turnSeatAtEvent.set(event.kind, s.state.turnSeat);
        },
      },
    );
    s.state.memory = 3;
    await s.ready();
    const targetInstanceId = s.perm("target").topCard!.instanceId;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await turn;

    const kinds = s.events.map((event) => event.kind);
    expect(memoryAtEvent.get("attackDeclared")).toBe(-3);
    expect(turnSeatAtEvent.get("attackDeclared")).toBe(0);
    expect(turnSeatAtEvent.get("combatResolved")).toBe(0);
    expect(kinds.indexOf("combatResolved")).toBeGreaterThan(-1);
    expect(kinds.indexOf("combatResolved")).toBeLessThan(kinds.indexOf("turnEnded"));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(targetInstanceId);
    assertNoLoudGap(s);
  });

  it("cannot attack through [When Digivolving] when the Digimon was played this turn (Q1241)", async () => {
    const digivolveOnto = async (baseInPlay: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: baseInPlay ? [{ card: "BT3-057", as: "base" }] : [],
            hand: [...(baseInPlay ? [] : [{ card: "BT3-057", as: "base" }]), { card: "BT4-090", as: "evolving" }],
          },
          1: { battleArea: [{ card: "BT1-009", as: "target" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 20;
      if (!baseInPlay) {
        s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("base").instanceId });
        await settle(() => s.state.players[0]!.battleArea.length === 1);
      }
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT3-057"]);
      const base = s.state.players[0]!.battleArea[0]!;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: base.permanentId,
          instanceId: s.inst("evolving").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT4-090"));
      await settle();
      return s;
    };

    const playedThisTurn = await digivolveOnto(false);
    expect(playedThisTurn.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(playedThisTurn.state.players[1]!.battleArea).toHaveLength(1);

    const alreadyInPlay = await digivolveOnto(true);
    expect(alreadyInPlay.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    expect(alreadyInPlay.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("resolves every other digivolve-triggered effect before its attack resolves (Q1242)", async () => {
    const trace: string[] = [];
    let handSizeWhenCombatResolved = 0;
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-057", as: "base", suspended: true },
            { card: "BT5-091", as: "tamer" },
          ],
          hand: [{ card: "BT4-090", as: "evolving" }],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferTriggerKeys: ["BT4-090"],
        onEvent: (event) => {
          if (event.kind === "attackDeclared") trace.push("attackDeclared");
          if (event.kind === "combatResolved") {
            trace.push("combatResolved");
            handSizeWhenCombatResolved = s.state.players[0]!.hand.length;
          }
          if (event.kind === "effectResolved" && event.sourceCardId === "BT5-091") trace.push("tamerResolved");
        },
      },
    );
    s.state.memory = 10;
    await s.ready();
    const targetInstanceId = s.perm("target").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => trace.includes("combatResolved") && trace.includes("tamerResolved"));

    expect(trace).toEqual(["attackDeclared", "tamerResolved", "combatResolved"]);
    const digivolveBonusDrawPlusTamerDraw = 2;
    expect(handSizeWhenCombatResolved).toBe(digivolveBonusDrawPlusTamerDraw);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(targetInstanceId);
  });

  it("cannot attack an unsuspended Digimon outside its [When Digivolving] attack (Q1243)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-090", as: "chaos" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "unsuspended" },
          { card: "BT1-009", as: "suspended", suspended: true },
        ],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("chaos").permanentId,
        target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.perm("chaos").isSuspended).toBe(false);

    const suspendedInstanceId = s.perm("suspended").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("chaos").permanentId,
        target: { kind: "permanent", permanentId: s.perm("suspended").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === suspendedInstanceId));
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.perm("unsuspended").topCard!.instanceId,
    ]);
  });
});
