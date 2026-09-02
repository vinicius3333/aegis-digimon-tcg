import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-010.js";
import "../index.js";

const CARD_ID = "EX10-010";

describe("EX10-010 BlackWarGreymon", () => {
  it("records the exact ACE facts, keywords, deletion boundary, and conditional effects", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      colors: ["Red", "Black"],
      level: 6,
      playCost: 7,
      dp: 12000,
      isAce: true,
      overflowMemory: 4,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    expect(
      compiled.effects
        ?.filter((effect) => effect.trigger === "Static")
        .flatMap((effect) => effect.keywords ?? [])
        .map(({ keyword }) => keyword),
    ).toEqual(["Raid", "Reboot", "Blocker"]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLte: 7 }, count: 1 },
          },
        ],
      });
    }
    // The "While your opponent has ..." gate is spelled `condition`, the typed field the shared
    // per-action gate reads (`action.condition ?? action.while`). `while` is not declared on
    // ModifyDPAction / GrantImmunityAction, so the old spelling did not typecheck.
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "ModifyDP",
          amount: 3000,
          duration: "permanent",
          condition: { kind: "opponentHas", filter: { kind: ["Digimon"], dp: { op: "gte", value: 13000 } } },
        },
        {
          kind: "GrantImmunity",
          immuneFrom: "opponentDigimonEffects",
          duration: "permanent",
          condition: { kind: "opponentHas", filter: { kind: ["Digimon"], dp: { op: "gte", value: 13000 } } },
        },
      ],
    });
  });

  it("deletes an opposing Digimon at play cost 7 but not one above the boundary", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }] },
        1: {
          battleArea: [
            { card: "EX10-008", as: "cost7" },
            { card: "BT5-082", as: "cost12" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost7").permanentId);
    const cost7Id = s.perm("cost7").permanentId;
    const cost12Id = s.perm("cost12").permanentId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(cost7Id);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(cost12Id);
  });

  it("uses the normal cost-4 evolution route and can delete an opposing Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-008", as: "base" }],
          hand: [{ card: CARD_ID, as: "ace" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-085", as: "tamer" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("tamer").permanentId);
    const tamerId = s.perm("tamer").permanentId;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ace").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(tamerId);
  });

  it("publishes Raid, Reboot, and Blocker as live shared keywords", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "source" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("source"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
  });

  it("turns on at exactly 13000 DP and turns off immediately below the threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "source" }] },
      1: { battleArea: [{ card: "BT5-082", as: "threshold", dp: 13000 }] },
    });
    await s.ready();

    expect(s.perm("source").currentDP).toBe(15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Option")).toBe(false);

    s.perm("threshold").baseDP = 12999;
    s.perm("threshold").currentDP = 12999;
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("source").currentDP).toBe(12000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon")).toBe(false);
  });

  it("re-evaluates the continuous bonus and immunity when the qualifying Digimon leaves", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "source" }] },
      1: { battleArea: [{ card: "BT5-082", as: "threshold", dp: 13000 }] },
    });
    await s.ready();
    const thresholdId = s.perm("threshold").permanentId;

    expect(s.perm("source").currentDP).toBe(15000);
    expect(await advance(s.engine).verb.deletePermanent([thresholdId], "byEffect")).toBe(1);
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("source").currentDP).toBe(12000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon")).toBe(false);
  });

  it("reads the threshold on the OPPONENT's board only", async () => {
    // "While your OPPONENT has a Digimon with 13000 DP or more". FAILS-WHEN-REVERTED: dropping
    // `controller: "opponent"` (or using `anyHas`) turns the grant on from my own big Digimon.
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "source" },
          { card: "BT5-082", as: "myBig", dp: 14000 },
        ],
      },
      1: { battleArea: [{ card: "BT1-010", as: "small", dp: 3000 }] },
    });
    await s.ready();

    expect(s.perm("source").currentDP).toBe(12000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon")).toBe(false);
  });

  it("Q5013/Q5202 two-facing-copies loop: the recompute pass reaches only the direct half", async () => {
    // Q5202 stages exactly this board: both players control an EX10-010, and I control a
    // Digimon whose ORIGINAL DP is 13000+. The ruling says BOTH [All Turns] effects activate
    // and both DPs become 15000 — my big Digimon turns THEIR copy on, and their copy's
    // resulting 15000 DP turns MINE on in a self-sustaining loop.
    //
    // `GameEngine.runContinuousPass` clears every continuous contribution and then resolves
    // each continuous effect exactly once, in `continuousPriority` order, with no fixpoint
    // iteration. A continuous DP grant therefore cannot satisfy another continuous gate in the
    // same pass, and a MUTUAL cycle cannot be fixed by ordering at all. This test pins the
    // fixpoint the engine actually reaches, so the divergence from the ruling is asserted
    // rather than assumed. See seam request 3 in the batch audit report.
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "mine" },
          { card: "BT5-082", as: "big", dp: 13000 },
        ],
      },
      1: { battleArea: [{ card: CARD_ID, as: "theirs" }] },
    });
    await s.ready();

    // The DIRECT half is correct: my 13000 DP Digimon is their opponent's Digimon, so their
    // copy turns on and gains both the +3000 and the immunity.
    expect(s.perm("theirs").currentDP).toBe(15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("theirs"), "beAffected", "Digimon")).toBe(true);

    // The INDIRECT half does not close. Ruling value: 15000 and immune.
    expect(s.perm("mine").currentDP).toBe(12000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("mine"), "beAffected", "Digimon")).toBe(false);

    // The pass is at least idempotent: repeating it neither converges nor accumulates.
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("theirs").currentDP).toBe(15000);
    expect(s.perm("mine").currentDP).toBe(12000);

    // Q5202's second half: once the 13000 DP Digimon leaves, the ruling keeps BOTH copies
    // activated at 15000. Because nothing was self-sustaining, both drop to printed DP.
    expect(await advance(s.engine).verb.deletePermanent([s.perm("big").permanentId], "byEffect")).toBe(1);
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("theirs").currentDP).toBe(12000);
    expect(s.perm("mine").currentDP).toBe(12000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("theirs"), "beAffected", "Digimon")).toBe(false);
  });
});
