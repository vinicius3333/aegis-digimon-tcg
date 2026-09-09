import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// Fixtures (inert main-deck Digimon only; no Digi-Egg in a deck or in security):
//   BT1-009 Monodramon    Lv3 Red   3000, no text  — deck/security filler
//   BT1-013 Muchomon      Lv3 Red   5000, no text  — deck/security filler / opponent opener
//   BT1-011 Agumon Expert Lv3 Red   1000           — opponent Digimon target
//   BT1-012 Biyomon       Lv3 Red   2000, no text  — own Digimon near miss
//   BT1-071 Vegiemon      Lv4 Green 6000, no text  — legal Green Lv4 evolution / blast base
//   BT1-064 Goblimon      Lv3 Green 3000, no text  — ILLEGAL source (level too low)
//   BT1-014 Kokatorimon   Lv4 Red   4000, no text  — ILLEGAL source (wrong colour)
//   BT19-051 AtlurBallistamon Lv5 Green/Black 7000 — realistic inherited host
//   BT19-081 Kiriha Aonuma    Blue Tamer           — opponent Tamer target
const DECK = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

describe("BT19-050 Rapidmon", () => {
  it("matches the catalog print, including ACE Overflow ＜3＞", () => {
    expect(getCardDefinition("BT19-050")).toMatchObject({
      cardId: "BT19-050",
      nameEn: "Rapidmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 5,
      dp: 8000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg"],
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      isAce: true,
      overflowMemory: 3,
      effectText:
        "[Hand] [Counter] ＜Blast Digivolve＞ \n[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. Then, 1 of their Digimon or Tamers can't unsuspend until the end of their turn.",
      inheritedEffectText: "[Your Turn] This Digimon gets +4000 DP.",
    });
  });

  it("compiles the hand Counter keyword, both copies of the suspend/lock clause and the inherited DP", () => {
    const compiled = runtimeCompiledCard("BT19-050");
    expect(compiled?.effects[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    for (const [index, trigger] of [
      [1, "OnPlay"],
      [2, "WhenDigivolving"],
    ] as const) {
      expect(compiled?.effects[index]).toMatchObject({
        trigger,
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 } },
          {
            kind: "Restrict",
            restriction: "unsuspend",
            // "until the end of their turn" — their turn is the opponent's turn.
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
          },
        ],
      });
    }
    expect(compiled?.effects[3]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 4000, target: { isSelf: true } }],
    });
  });

  // ---------------------------------------------------------------------------
  // [On Play] Suspend 1 of your opponent's Digimon or Tamers. Then, 1 of their
  // Digimon or Tamers can't unsuspend until the end of their turn.
  // ---------------------------------------------------------------------------

  it.each([
    ["an opponent Digimon", "BT1-011"],
    ["an opponent Tamer", "BT19-081"],
  ])("suspends and locks %s on a public play, never the controller's own permanents", async (_label, targetCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-012", as: "own" }],
          hand: [{ card: "BT19-050", as: "rapid" }],
          deck: DECK,
          security: SECURITY,
        },
        1: { battleArea: [{ card: targetCard, as: "target" }], security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rapid").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    await drainMicrotasks(80);

    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
    expect(s.perm("own").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("own"), "unsuspend")).toBe(false);
    // Only the play cost of 5 was paid.
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("may choose an ALREADY suspended opponent Digimon (comprehensive 15-15-5-1/-3, Q845, Q1219)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-050", as: "rapid" }],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT1-011", as: "already", suspended: true },
            { card: "BT1-012", as: "fresh" },
          ],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("already").permanentId, s.perm("already").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rapid").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("already"), "unsuspend"));
    await drainMicrotasks(80);

    // The already-suspended Digimon was offered to BOTH actions and the scripted answer took
    // it; the fresh peer is untouched by either.
    // `candidateInstanceIds` carries PERMANENT ids for a permanent target.
    const offered = s.decisions.filter(
      (entry) =>
        entry.req.kind === "chooseTargets" &&
        entry.req.options?.candidateInstanceIds?.includes(s.perm("already").permanentId) === true,
    );
    expect(offered).toHaveLength(2);
    expect(s.perm("already").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("already"), "unsuspend")).toBe(true);
    expect(s.perm("fresh").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("fresh"), "unsuspend")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the locked Digimon suspended through the opponent's real unsuspend phase and releases it afterwards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [],
          hand: [
            { card: "BT19-050", as: "rapid" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-011", as: "target" }],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rapid").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);

    // The opponent's own turn ran its real unsuspend phase; the lock held.
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    // "Until the end of their turn": the restriction is gone on our next turn.
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
    expect(s.perm("target").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("fires the same clause on a real Green Lv.4 digivolve for 3 memory, stacking the source and drawing 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-071", as: "base" }],
          hand: [{ card: "BT19-050", as: "rapid" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-011", as: "target" }], security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rapid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-050");
    await settle(() => s.perm("target").isSuspended);
    await drainMicrotasks(80);

    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it.each([
    ["a Green Lv.3 (level too low)", "BT1-064"],
    ["a Red Lv.4 (wrong colour)", "BT1-014"],
  ])("refuses %s as a digivolution source", async (_label, sourceCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: sourceCard, as: "base" }],
          hand: [{ card: "BT19-050", as: "rapid" }],
          deck: DECK,
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-011", as: "target" }], security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rapid").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard?.cardId).toBe(sourceCard);
    expect(s.state.memory).toBe(5);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // [Hand] [Counter] ＜Blast Digivolve＞
  // ---------------------------------------------------------------------------

  it("blast digivolves from hand in the opponent's counter window for no memory and still fires its clause", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-071", as: "base" }],
          hand: [{ card: "BT19-050", as: "rapid" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
            { card: "BT1-009", as: "sec3" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "attacker" },
            { card: "BT1-011", as: "locked" },
          ],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("locked").permanentId, s.perm("locked").topCard!.instanceId);
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 6;

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
        sourceInstanceId: s.inst("rapid").instanceId,
        effectKey: `blast-digivolve:${s.perm("base").permanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-050");
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // ＜Blast Digivolve＞ waived the memory cost but still drew the digivolution bonus card.
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    // The [When Digivolving] clause resolved off the blast.
    expect(s.perm("locked").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(true);
    // The unblocked attack still checked exactly one security card.
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("sec2").instanceId,
      s.inst("sec3").instanceId,
    ]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("pays ACE Overflow ＜3＞ when it leaves the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-050", as: "rapid" }],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rapid").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await drainMicrotasks(60);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-050"]);
    expect(s.state.memory).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // Inherited: [Your Turn] This Digimon gets +4000 DP.
  // ---------------------------------------------------------------------------

  it("gives a real host +4000 DP only on its controller's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-051", as: "host", under: ["BT19-050"] },
            { card: "BT19-051", as: "peer", under: ["BT19-047"] },
          ],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }], hand: ["BT1-013"], deck: DECK, security: SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(11_000);
    // A same-name host WITHOUT BT19-050 in its digivolution cards gets nothing.
    expect(s.perm("peer").currentDP).toBe(7000);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.perm("peer").currentDP).toBe(7000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(11_000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
