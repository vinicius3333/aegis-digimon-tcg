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
            expect.objectContaining({ kind: "Restrict", restriction: "unsuspend", duration: "untilEachTurnEnd" }),
          ],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([
      {
        namesExact: ["Astamon"],
        cost: 7,
        isAlternate: true,
        controllerControls: { kind: ["Tamer"], namesExact: ["Ryoma Mogami"] },
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
    expect(observe(s.engine).isRestricted(s.perm("quartz"), "unsuspend")).toBe(false);
    for (const alias of ["mine", "theirs", "tamer"]) {
      expect(observe(s.engine).isRestricted(s.perm(alias), "unsuspend")).toBe(true);
    }
  });
});
