import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
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

  it.each([0, 1] as const)("Q5013/Q5202 mutual fixed point with the seed on seat %s", async (seedSeat) => {
    // Q5202 stages exactly this board: both players control an EX10-010, and I control a
    // Digimon whose ORIGINAL DP is 13000+. The ruling says BOTH [All Turns] effects activate
    // and both DPs become 15000 — my big Digimon turns THEIR copy on, and their copy's
    // resulting 15000 DP turns MINE on in a self-sustaining loop.
    //
    // The continuous layer re-derives from a clean tier while carrying the previous pass's
    // derived DP as a seed. This closes the mutual dependency regardless of effect ordering.
    const mine = {
      battleArea: [
        { card: CARD_ID, as: "mine" },
        { card: "BT5-082", as: "big", dp: 13000 },
      ],
    };
    const theirs = { battleArea: [{ card: CARD_ID, as: "theirs" }] };
    const s = setupEngine(seedSeat === 0 ? { 0: mine, 1: theirs } : { 0: theirs, 1: mine });
    await s.ready();

    // The DIRECT half is correct: my 13000 DP Digimon is their opponent's Digimon, so their
    // copy turns on and gains both the +3000 and the immunity.
    expect(s.perm("theirs").currentDP).toBe(15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("theirs"), "beAffected", "Digimon")).toBe(true);

    // The INDIRECT half closes on the next fixpoint pass. Ruling value: 15000 and immune.
    expect(s.perm("mine").currentDP).toBe(15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("mine"), "beAffected", "Digimon")).toBe(true);

    // Repeating the stable pass must not accumulate more DP.
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("theirs").currentDP).toBe(15000);
    expect(s.perm("mine").currentDP).toBe(15000);

    // Q5202's second half: once the 13000 DP Digimon leaves, the established mutual grants
    // remain active at 15000.
    expect(await advance(s.engine).verb.deletePermanent([s.perm("big").permanentId], "byEffect")).toBe(1);
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("theirs").currentDP).toBe(15000);
    expect(s.perm("mine").currentDP).toBe(15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("theirs"), "beAffected", "Digimon")).toBe(true);

    // A guaranteed rule-based departure breaks the mutual support. The last copy must
    // lose both its DP grant and immunity instead of retaining the prior pass's seed.
    expect(await advance(s.engine).verb.deletePermanent([s.perm("theirs").permanentId], "byRule")).toBe(1);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("mine").currentDP).toBe(12000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("mine"), "beAffected", "Digimon")).toBe(false);
  });

  it("keeps two unseeded facing copies at printed DP in either seat ordering", async () => {
    for (const order of [0, 1]) {
      const s = setupEngine({
        0: { battleArea: [{ card: CARD_ID, as: "left" }] },
        1: { battleArea: [{ card: CARD_ID, as: "right" }] },
      });
      s.state.turnSeat = order as 0 | 1;
      await s.ready();
      await s.engine.recomputeContinuousEffects();
      expect(s.perm("left").currentDP).toBe(12000);
      expect(s.perm("right").currentDP).toBe(12000);
    }
  });

  it("Q5013 suppresses the temporary opposing +3000 after both copies turn on", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "mine" },
            { card: "EX10-007", as: "greymon" },
          ],
        },
        1: { battleArea: [{ card: CARD_ID, as: "theirs" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("theirs").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("greymon"));
    await settle(() => s.perm("mine").currentDP === 15000 && s.perm("theirs").currentDP === 15000);

    // The Greymon grant is temporary and opposing to theirs. Once theirs becomes immune,
    // that grant must be suppressed; its final 15000 is exactly 12000 + its own static grant.
    expect(s.perm("mine").currentDP).toBe(15000);
    expect(s.perm("theirs").currentDP).toBe(15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("mine"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("theirs"), "beAffected", "Digimon")).toBe(true);

    s.state.turnSeat = 1;
    advance(s.engine).ledgers.continuous.sweep(s.state, "ownerTurnEnd", 1);
    advance(s.engine).ledgers.modifiers.sweep(s.state, "ownerTurnEnd", 1);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("mine").currentDP).toBe(15000);
    expect(s.perm("theirs").currentDP).toBe(15000);
  });

  it("Q5024 revives a suppressed opposing DP grant when the immunity gate lapses", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-007", as: "greymon" },
            { card: "BT5-082", as: "qualifier", dp: 12000 },
          ],
        },
        1: { battleArea: [{ card: CARD_ID, as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("greymon"));
    await settle(() => s.perm("target").currentDP === 15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("target"), "beAffected", "Digimon")).toBe(false);

    // Cross the gate after the opposing +3000 has already been recorded.
    await advance(s.engine).verb.modifyDP(s.perm("qualifier").permanentId, 1000, EffectDuration.UntilOpponentTurnEnd);
    await settle(() => observe(s.engine).isRestrictedByEffect(s.perm("target"), "beAffected", "Digimon"));
    expect(s.perm("target").currentDP).toBe(15000);

    // The +3000 remains in the duration ledger while immunity is active. Removing the
    // 13000-DP qualifier lapses only the immunity/static grant; the opponent-origin grant
    // must become visible again instead of having been deleted at the immunity boundary.
    expect(await advance(s.engine).verb.deletePermanent([s.perm("qualifier").permanentId], "byEffect")).toBe(1);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestrictedByEffect(s.perm("target"), "beAffected", "Digimon")).toBe(false);
    expect(s.perm("target").currentDP).toBe(15000);
  });
});
