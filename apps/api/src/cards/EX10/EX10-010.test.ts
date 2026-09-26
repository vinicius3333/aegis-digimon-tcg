import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { MemoryGauge } from "../../engine/MemoryGauge.js";
import { compiled } from "./EX10-010.js";
import "../index.js";

const CARD_ID = "EX10-010";
const BASE_L5 = "BT1-024";
const COST_7 = "BT10-065";
const COST_8 = "BT12-069";
const BIG_13K = "BT8-030";

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

  it("[On Play] through a public playCard deletes the cost-7 Digimon and leaves the cost-8 one", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "ace" }, "BT1-009"], deck: ["BT1-010", "BT1-011"] },
        1: {
          battleArea: [
            { card: COST_7, as: "cost7" },
            { card: COST_8, as: "cost8" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost7").permanentId);
    const cost7Id = s.perm("cost7").permanentId;
    const cost8Id = s.perm("cost8").permanentId;
    s.state.memory = 7;
    const aceInstanceId = s.inst("ace").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: aceInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === aceInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([cost8Id]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(cost7Id);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual([COST_7]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Play] finds no target when every opposing Digimon costs more than 7", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "ace" }, "BT1-009"], deck: ["BT1-010", "BT1-011"] },
        1: {
          battleArea: [
            { card: COST_8, as: "cost8" },
            { card: BIG_13K, as: "cost10" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    const aceInstanceId = s.inst("ace").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: aceInstanceId })).toEqual({ ok: true });
    await settleAcrossTimers(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === aceInstanceId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses the normal cost-4 evolution route and can delete an opposing Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-008", as: "base" }],
          hand: [{ card: CARD_ID, as: "ace" }],
          deck: ["BT1-009", "BT1-010"],
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

  it("public digivolution over an inert Lv.5 keeps the source under the top card and draws the bonus", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BASE_L5, as: "base" }],
          hand: [{ card: CARD_ID, as: "ace" }, "BT1-009"],
          deck: [{ card: "BT1-010", as: "evoDraw" }, "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: COST_7, as: "cost7" },
            { card: COST_8, as: "cost8" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost7").permanentId);
    const baseCardId = s.perm("base").topCard.instanceId;
    const aceInstanceId = s.inst("ace").instanceId;
    const cost8Id = s.perm("cost8").permanentId;
    s.state.memory = 4;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: aceInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.instanceId).toBe(aceInstanceId);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseCardId]);
    expect(s.perm("base").currentDP).toBe(12000);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("evoDraw").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([cost8Id]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal Lv.4 source for the Lv.5 digivolution requirement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "lv4" }],
        hand: [{ card: CARD_ID, as: "ace" }, "BT1-009"],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("lv4").permanentId,
      instanceId: s.inst("ace").instanceId,
    });

    expect(result.ok).toBe(false);
    expect(s.perm("lv4").topCard.cardId).toBe("BT1-014");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("ace").instanceId);
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
    const mine = {
      battleArea: [
        { card: CARD_ID, as: "mine" },
        { card: "BT5-082", as: "big", dp: 13000 },
      ],
    };
    const theirs = { battleArea: [{ card: CARD_ID, as: "theirs" }] };
    const s = setupEngine(seedSeat === 0 ? { 0: mine, 1: theirs } : { 0: theirs, 1: mine });
    await s.ready();

    expect(s.perm("theirs").currentDP).toBe(15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("theirs"), "beAffected", "Digimon")).toBe(true);

    expect(s.perm("mine").currentDP).toBe(15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("mine"), "beAffected", "Digimon")).toBe(true);

    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("theirs").currentDP).toBe(15000);
    expect(s.perm("mine").currentDP).toBe(15000);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("big").permanentId], "byEffect")).toBe(1);
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("theirs").currentDP).toBe(15000);
    expect(s.perm("mine").currentDP).toBe(15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("theirs"), "beAffected", "Digimon")).toBe(true);

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

  it("Q5013 reaches both facing immunity gates from a public Greymon play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "mine" }],
          hand: [{ card: "EX10-007", as: "greymon" }],
        },
        1: { battleArea: [{ card: CARD_ID, as: "theirs" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("theirs").permanentId);
    s.state.memory = 4;
    await s.ready();
    expect(s.perm("mine").currentDP).toBe(12000);
    expect(s.perm("theirs").currentDP).toBe(12000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mine").currentDP === 15000 && s.perm("theirs").currentDP === 15000);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("greymon").instanceId);
    expect(s.perm("mine").currentDP).toBe(15000);
    expect(s.perm("theirs").currentDP).toBe(15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("mine"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("theirs"), "beAffected", "Digimon")).toBe(true);
  });

  it("Q5013 suppresses the temporary opposing +3000 after both copies turn on", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "mine" }],
          hand: [{ card: "EX10-007", as: "greymon" }],
          deck: Array.from({ length: 10 }, () => "BT1-010"),
        },
        1: { battleArea: [{ card: CARD_ID, as: "theirs" }], deck: Array.from({ length: 10 }, () => "BT1-011") },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("theirs").permanentId);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mine").currentDP === 15000 && s.perm("theirs").currentDP === 15000);

    expect(s.state.memory).toBe(0);
    expect(s.perm("mine").currentDP).toBe(15000);
    expect(s.perm("theirs").currentDP).toBe(15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("mine"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("theirs"), "beAffected", "Digimon")).toBe(true);

    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("mine").currentDP).toBe(15000);
    expect(s.perm("theirs").currentDP).toBe(15000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    expect(s.perm("mine").currentDP).toBe(15000);
    expect(s.perm("theirs").currentDP).toBe(15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("mine"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("theirs"), "beAffected", "Digimon")).toBe(true);
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

    await advance(s.engine).verb.modifyDP(s.perm("qualifier").permanentId, 1000, EffectDuration.UntilOpponentTurnEnd);
    await settle(() => observe(s.engine).isRestrictedByEffect(s.perm("target"), "beAffected", "Digimon"));
    expect(s.perm("target").currentDP).toBe(15000);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("qualifier").permanentId], "byEffect")).toBe(1);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestrictedByEffect(s.perm("target"), "beAffected", "Digimon")).toBe(false);
    expect(s.perm("target").currentDP).toBe(15000);
  });

  it("Q5024 publicly restores Greymon's DP grant when an inherited hand-size aura lapses", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-082", as: "qualifier", dp: 12000, under: ["EX6-049"] }],
          hand: [
            { card: "EX10-007", as: "greymon" },
            { card: "EX6-049", as: "devimon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: CARD_ID, as: "target" }],
          hand: Array(7).fill("BT1-012"),
          deck: ["BT1-013", "BT1-014", "BT1-015"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[1]!.hand).toHaveLength(7);
    expect(s.perm("qualifier").currentDP).toBe(12000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("target"), "beAffected", "Digimon")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("devimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.length === 6);
    expect(s.perm("qualifier").currentDP).toBe(13000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("target"), "beAffected", "Digimon")).toBe(true);
    expect(s.perm("target").currentDP).toBe(15000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.hand).toHaveLength(7);
    expect(s.perm("qualifier").currentDP).toBe(12000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("target"), "beAffected", "Digimon")).toBe(false);
    expect(s.perm("target").currentDP).toBe(15000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("＜Raid＞ redirects a public player-directed attack onto the highest-DP unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }], deck: ["BT1-010", "BT1-011"], security: ["BT1-009"] },
        1: {
          battleArea: [
            { card: COST_8, as: "high" },
            { card: "BT1-009", as: "low" },
          ],
          security: ["BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const highId = s.perm("high").permanentId;
    const lowId = s.perm("low").permanentId;
    const securityBefore = s.state.players[1]!.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lowId]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(highId);
    expect(s.state.players[1]!.security).toHaveLength(securityBefore);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("＜Blocker＞ blocks a public attack, and the battle removing the 13000 DP Digimon drops the gate", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }], deck: ["BT1-010", "BT1-011"], security: ["BT1-009"] },
        1: {
          battleArea: [{ card: BIG_13K, as: "big" }],
          security: ["BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const bigId = s.perm("big").permanentId;
    const securityBefore = s.state.players[0]!.security.length;

    expect(s.perm("source").currentDP).toBe(15000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: bigId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("source").permanentId })).toEqual(
      { ok: true },
    );
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("source").currentDP).toBe(12000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon")).toBe(false);
  });

  it("＜Reboot＞ unsuspends it during the opponent's real unsuspend phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "BT1-009", as: "control" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: COST_8, as: "theirs", suspended: true }],
          hand: ["BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    for (const alias of ["source", "control"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    }
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.perm("control").isSuspended).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("control").isSuspended).toBe(true);
    expect(s.perm("theirs").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Hand] [Counter] ＜Blast Digivolve＞ enters play in the opponent's real counter window", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BASE_L5, as: "base" }],
          hand: [{ card: CARD_ID, as: "ace" }, "BT1-009"],
          deck: [{ card: "BT1-010", as: "evoDraw" }, "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: COST_8, as: "attacker" },
            { card: COST_7, as: "cost7", suspended: true },
          ],
          hand: ["BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("cost7").permanentId);
    const aceInstanceId = s.inst("ace").instanceId;
    const baseCardId = s.perm("base").topCard.instanceId;
    const basePermanentId = s.perm("base").permanentId;
    const cost7Id = s.perm("cost7").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const memoryBefore = s.state.memory;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking());

    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: aceInstanceId,
        effectKey: `blast-digivolve:${basePermanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === aceInstanceId);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("base").topCard.instanceId).toBe(aceInstanceId);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseCardId]);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("evoDraw").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(cost7Id);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    ["gate open", true, 15000],
    ["gate shut", false, 9000],
  ])(
    "Q5020/Q5021 an opposing Digimon's -3000 DP effect still CHOOSES it but cannot affect it (%s)",
    async (_label, gateOpen, expectedDP) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: CARD_ID, as: "source" }], deck: ["BT1-010", "BT1-011"] },
          1: {
            battleArea: gateOpen ? [{ card: BIG_13K, as: "big" }] : [],
            hand: [{ card: "BT1-055", as: "angemon" }, "BT1-009"],
            deck: ["BT1-012", "BT1-013"],
          },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      s.state.turnSeat = 1;
      s.state.memory = 8;
      await s.engine.recomputeContinuousEffects();
      const angemonId = s.inst("angemon").instanceId;

      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: angemonId })).toEqual({ ok: true });
      await settleAcrossTimers(
        () =>
          s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === angemonId) &&
          s.state.pendingDecision === undefined,
      );

      expect(s.perm("source").currentDP).toBe(expectedDP);
      expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon")).toBe(gateOpen);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("Q5023 an already-applied opposing -3000 DP stops applying the moment the gate opens", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }], deck: ["BT1-010", "BT1-011"] },
        1: {
          hand: [{ card: "BT1-055", as: "angemon" }, { card: BIG_13K, as: "big" }, "BT1-009"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 8;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("angemon").instanceId })).toEqual({
      ok: true,
    });
    await settleAcrossTimers(() => s.perm("source").currentDP === 9000 && s.state.pendingDecision === undefined);
    expect(s.perm("source").currentDP).toBe(9000);

    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("big").instanceId })).toEqual({ ok: true });
    await settleAcrossTimers(
      () =>
        s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === BIG_13K) &&
        s.state.pendingDecision === undefined,
    );

    expect(observe(s.engine).isRestrictedByEffect(s.perm("source"), "beAffected", "Digimon")).toBe(true);
    expect(s.perm("source").currentDP).toBe(15000);
  });

  it("＜Overflow＞ 4 charges its own controller when it is deleted in a public battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BASE_L5, as: "attacker", dp: 12999 }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: CARD_ID, as: "ace", suspended: true }],
          security: ["BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(s.perm("ace").currentDP).toBe(12000);
    const before = new MemoryGauge(s.state).memoryFor(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ace").permanentId },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.players[1]!.battleArea.length === 0);

    expect(new MemoryGauge(s.state).memoryFor(1)).toBe(before - 4);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });

  it("＜Overflow＞ is not charged when the ACE ENTERS the battle area", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: CARD_ID, as: "ace" }, "BT1-009"], deck: ["BT1-010", "BT1-011"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    const aceInstanceId = s.inst("ace").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: aceInstanceId })).toEqual({ ok: true });
    await settleAcrossTimers(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === aceInstanceId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.memory).toBe(0);
  });
});
