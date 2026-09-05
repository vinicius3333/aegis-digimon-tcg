import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import compiled from "./EX10-023.js";
import "../index.js";

const CARD_ID = "EX10-023";

describe("EX10-023 Quartzmon compiled contract", () => {
  it("preserves Blast Digivolve, global suspension, shared deletion, and unsuspend lock", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Counter",
          isFromHand: true,
          keywords: [expect.objectContaining({ keyword: "BlastDigivolve" })],
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [expect.objectContaining({ kind: "Suspend", target: expect.objectContaining({ count: "all" }) })],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [expect.objectContaining({ kind: "Suspend", target: expect.objectContaining({ count: "all" }) })],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          frequency: "OncePerTurn",
          sharedUseKey: "EX10-023/suspended-delete",
        }),
        expect.objectContaining({
          trigger: "WhenAttacking",
          frequency: "OncePerTurn",
          sharedUseKey: "EX10-023/suspended-delete",
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          actions: [
            expect.objectContaining({
              kind: "Restrict",
              restriction: "unsuspendDuringUnsuspendPhase",
              duration: "forTheTurn",
            }),
          ],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([
      {
        namesExact: ["Astamon"],
        cost: 7,
        isAlternate: true,
        controllerControls: { kind: ["Digimon", "Tamer"], namesExact: ["Ryoma Mogami"] },
      },
    ]);
  });

  it("records the exact ACE catalog and normal evolution boundaries", async () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Green", "Black"],
      level: 7,
      playCost: 9,
      dp: 15000,
      evoCosts: [
        { color: "Green", level: 6, memoryCost: 5 },
        { color: "Black", level: 6, memoryCost: 5 },
      ],
      isAce: true,
      overflowMemory: 5,
      types: ["Unidentified"],
    });
    for (const baseCard of ["AD1-024", "AD1-004"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: CARD_ID, as: "quartz" }] },
      });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("quartz").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(0);
    }
  });

  it("the cost-7 alternate route requires Astamon as base and Ryoma Mogami in play", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-018", as: "astamon" },
          { card: "EX10-067", as: "ryoma" },
        ],
        hand: [{ card: CARD_ID, as: "quartz" }],
      },
    });
    legal.state.memory = 7;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("astamon").permanentId,
        instanceId: legal.inst("quartz").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("astamon").topCard.cardId === CARD_ID);

    for (const fixture of [
      { battleArea: [{ card: "EX10-018", as: "base" }] },
      {
        battleArea: [
          { card: "BT10-081", as: "base" },
          { card: "EX10-067", as: "ryoma" },
        ],
      },
    ]) {
      const s = setupEngine({ 0: { ...fixture, hand: [{ card: CARD_ID, as: "quartz" }] } });
      s.state.memory = 7;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("quartz").instanceId,
          alternateRequirementIndex: 0,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
    }
  });

  it("On Play suspends every other Digimon and Tamer on both sides, never itself", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "quartz" },
          { card: "BT1-009", as: "mine" },
          { card: "BT1-085", as: "myTamer" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "theirs" },
          { card: "BT1-085", as: "theirTamer" },
        ],
      },
    });
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("quartz"));
    expect(s.perm("quartz").isSuspended).toBe(false);
    for (const alias of ["mine", "myTamer", "theirs", "theirTamer"]) expect(s.perm(alias).isSuspended).toBe(true);
  });

  it("deletes exactly 1 suspended opposing Digimon and shares the once-per-turn identity", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "quartz" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", suspended: true },
            { card: "BT1-010", as: "second", suspended: true },
            { card: "BT1-011", as: "standing" },
            { card: "BT1-085", as: "tamer", suspended: true },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("tamer").permanentId);
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("quartz"));
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(
      s.inst("first").instanceId,
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("quartz"));
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual(
      expect.arrayContaining([s.inst("second").instanceId, s.inst("standing").instanceId, s.inst("tamer").instanceId]),
    );
  });

  it("locks every other Digimon and Tamer from unsuspending while Quartzmon remains exempt", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "quartz", suspended: true },
          { card: "BT1-009", as: "mine", suspended: true },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "theirs", suspended: true },
          { card: "BT1-085", as: "tamer", suspended: true },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("quartz"), "unsuspendDuringUnsuspendPhase")).toBe(false);
    for (const alias of ["mine", "theirs", "tamer"]) {
      expect(observe(s.engine).isRestricted(s.perm(alias), "unsuspendDuringUnsuspendPhase")).toBe(true);
    }
  });

  it("keeps the unsuspend lock on a Digimon that entered after Quartzmon resolved", async () => {
    // The [All Turns] record uses "forTheTurn" (EffectDuration.UntilEachTurnEnd) and relies on
    // the continuous re-derivation of a static effect, so a later entrant must be locked too.
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "quartz", suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "first", suspended: true }] },
    });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("first"), "unsuspendDuringUnsuspendPhase")).toBe(true);

    const late = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "quartz", suspended: true }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "first", suspended: true },
          { card: "BT1-009", as: "late", suspended: true },
        ],
      },
    });
    await late.ready();
    expect(observe(late.engine).isRestricted(late.perm("late"), "unsuspendDuringUnsuspendPhase")).toBe(true);
    expect(observe(late.engine).isRestricted(late.perm("quartz"), "unsuspendDuringUnsuspendPhase")).toBe(false);
  });

  it("Q5075 the opponent's unsuspend phase flips nothing but Quartzmon's own controller's exempt card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "quartz", suspended: true }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "theirs", suspended: true },
          { card: "BT1-085", as: "tamer", suspended: true },
        ],
      },
    });
    await s.ready();
    const unsuspendForActivePhase = (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase.bind(s.engine);

    expect(await unsuspendForActivePhase(1)).toEqual([]);
    expect(s.perm("theirs").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);

    expect(await unsuspendForActivePhase(0)).toEqual([s.perm("quartz").permanentId]);
    expect(s.perm("quartz").isSuspended).toBe(false);
  });

  it("allows effect-driven unsuspension while blocking both active-phase paths", async () => {
    const locked = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "quartz" }] },
      1: { battleArea: [{ card: "BT1-010", as: "theirs", suspended: true }] },
    });
    await locked.ready();
    await advance(locked.engine).verb.unsuspend([locked.perm("theirs").permanentId]);
    expect(locked.perm("theirs").isSuspended).toBe(false);

    const control = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "neutral" }] },
      1: { battleArea: [{ card: "BT1-010", as: "theirs", suspended: true }] },
    });
    await control.ready();
    await advance(control.engine).verb.unsuspend([control.perm("theirs").permanentId]);
    expect(control.perm("theirs").isSuspended).toBe(false);
  });

  it("blocks an opponent Reboot unsuspend during the same phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "quartz" }] },
      1: { battleArea: [{ card: "AD1-013", as: "reboot", suspended: true }] },
    });
    await s.ready();
    const unsuspendForActivePhase = (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase.bind(s.engine);

    expect(await unsuspendForActivePhase(0)).toEqual([]);
    expect(s.perm("reboot").isSuspended).toBe(true);
  });
});
