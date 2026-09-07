import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-083.js";

/**
 * BT23-083 Fei, re-audited through public intents only.
 *
 * Printed text:
 *   [Start of Your Main Phase] If you have a Digimon with the [Royal Base] or [CS] trait, gain 1 memory.
 *   [All Turns] When cards are placed face up in your security stack, if any of them have the
 *     [Zaxon] or [Royal Base] trait, by suspending this Tamer, gain 1 memory. Then, if you have
 *     7 or fewer cards in your hand, <Draw 1>.
 *   [Security] Play this card without paying the cost.
 *
 * KB (node tools/kb/query.mjs card BT23-083):
 *   Q5356 — the "then" tail cannot be processed without the "by" (suspend) condition.
 *
 * Face-up security adds are driven by real cards: BT23-086 Yuugo places a [Zaxon] Digimon face
 * up as the bottom security card, and BT22-100 Cyberspace EDEN places ITSELF ([CS] only) face
 * up — the trait-gate negative.
 */

const FEI = "BT23-083";
const YUUGO = "BT23-086"; // [On Play] place a [Zaxon] Digimon face up as bottom security
const EDEN = "BT22-100"; // [Main] places itself ([CS], no [Zaxon]/[Royal Base]) face up
const ZAXON_DIGIMON = "BT23-015"; // Phoenixmon: [Holy Beast]/[Zaxon]/[CS]
const CS_DIGIMON = "BT23-045"; // Ophanimon: carries [Royal Base] and [CS]
const PLAIN_DIGIMON = "BT1-009"; // no [Royal Base]/[CS]/[Zaxon] trait
const FILLER = "BT1-010";

/** Memory as seen by seat 0 (state.memory is signed toward the turn player). */
function memoryOf(s: EngineSetup, seat: 0 | 1): number {
  return s.state.turnSeat === seat ? s.state.memory : -s.state.memory;
}

describe("BT23-083 Fei", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition(FEI)).toMatchObject({
      cardId: FEI,
      nameEn: "Fei",
      colors: ["Green", "Black"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["Zaxon", "CS"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);

    const startMain = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any;
    expect(startMain.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          zone: "battleArea",
          nameOrTrait: [{ tokens: ["Royal Base", "CS"], match: "trait" }],
        },
      },
    });

    const watcher = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenAddSecurity",
      fireCondition: {
        kind: "allOf",
        conditions: [
          { kind: "triggerSecurityIsYours" },
          {
            kind: "triggerAddedSecurityHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Zaxon", "Royal Base"], match: "trait" }] },
          },
        ],
      },
    });
    expect(watcher.actions[0]).toMatchObject({ kind: "Suspend", optional: true, abortOnDecline: true });
    expect(watcher.actions[1]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "ifThisEffectActed" },
    });
    expect(watcher.actions[2]).toMatchObject({
      kind: "Draw",
      amount: 1,
      condition: {
        kind: "allOf",
        conditions: [
          { kind: "ifThisEffectActed" },
          { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 7 },
        ],
      },
    });

    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("gains 1 memory at the start of its controller's main phase with a [CS] Digimon out", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: FEI, as: "fei" },
          { card: CS_DIGIMON, as: "cs" },
        ],
        hand: [FILLER],
        deck: Array(10).fill(FILLER),
      },
      1: { hand: [FILLER], deck: Array(10).fill(FILLER) },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(1);
    // The opponent's main phase: Fei's trigger is "[Start of YOUR Main Phase]".
    const opponentMainMemory = memoryOf(s, 0);
    expect(s.perm("cs")).toBeDefined();
    advance(s.engine).endMainPhaseIfOpen(1);

    await advance(s.engine).waitForMainPhase(0);
    // Seat 0's own main phase opened: +1 memory over what the turn change handed it.
    expect(memoryOf(s, 0)).toBeGreaterThan(opponentMainMemory);
    expect(memoryOf(s, 0)).toBe(4); // turn change sets 3 for the new turn player, then +1

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("gains no start-of-main memory without a [Royal Base]/[CS] Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: FEI, as: "fei" },
          { card: PLAIN_DIGIMON, as: "plain" },
        ],
        hand: [FILLER],
        deck: Array(10).fill(FILLER),
      },
      1: { hand: [FILLER], deck: Array(10).fill(FILLER) },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(memoryOf(s, 0)).toBe(3); // the turn-change memory only, no Fei gain
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not count a [CS] Digimon in the breeding area (CR 3-4-5-3)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: FEI, as: "fei" }],
        breeding: { card: CS_DIGIMON, as: "hatched" },
        hand: [FILLER],
        deck: Array(10).fill(FILLER),
      },
      1: { hand: [FILLER], deck: Array(10).fill(FILLER) },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    // An occupied breeding area makes the Breeding phase wait for seat 0's choice; "do
    // nothing" is an endPhase intent.
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0, 200);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    // Cards in the breeding area can't be referenced by an effect that does not name it.
    expect(memoryOf(s, 0)).toBe(3);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("suspends Fei, gains 1 memory and draws when a [Zaxon] card is placed face up in your security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: FEI, as: "fei" }],
          hand: [
            { card: YUUGO, as: "yuugo" },
            { card: ZAXON_DIGIMON, as: "zaxon" },
          ],
          security: [{ card: FILLER, as: "paid" }],
          deck: [{ card: "BT1-011", as: "drawn" }, ...Array(9).fill(FILLER)],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const zaxonId = s.inst("zaxon").instanceId;
    const paidId = s.inst("paid").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yuugo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    const player = s.state.players[0]!;
    expect(player.security.map((card) => ({ id: card.instanceId, faceUp: card.faceUp }))).toEqual([
      { id: zaxonId, faceUp: true },
    ]);
    expect(player.hand.map((card) => card.instanceId)).toContain(paidId); // Yuugo's own cost
    expect(player.hand.map((card) => card.instanceId)).toContain(drawnId); // Fei's <Draw 1>
    expect(s.perm("fei").isSuspended).toBe(true);
    // Yuugo costs 5; Fei's clause hands 1 memory back: 6 - 5 + 1 = 2.
    expect(memoryOf(s, 0)).toBe(2);
  });

  it("gains no memory and no draw when the suspend is declined (Q5356)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: FEI, as: "fei" }],
          hand: [
            { card: YUUGO, as: "yuugo" },
            { card: ZAXON_DIGIMON, as: "zaxon" },
          ],
          security: [{ card: FILLER, as: "paid" }],
          deck: [{ card: "BT1-011", as: "notDrawn" }, ...Array(9).fill(FILLER)],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    const notDrawnId = s.inst("notDrawn").instanceId;
    await s.ready();

    // Accept Yuugo's own optional prompt, then decline Fei's "by suspending this Tamer" prompt.
    const answered = new Set<string>();
    let declinedFeiPrompt = false;
    const answerNextOptional = async (accept: boolean): Promise<void> => {
      await settle(() => s.decisions.some((d) => d.req.kind === "optional" && !answered.has(d.req.decisionId)), 200);
      const next = s.decisions.find((d) => d.req.kind === "optional" && !answered.has(d.req.decisionId));
      expect(next, `expected an optional prompt (accept=${accept})`).toBeDefined();
      if (next === undefined) return;
      answered.add(next.req.decisionId);
      if (!accept) declinedFeiPrompt = true;
      s.engine.applyIntent(next.seat, {
        type: "respondDecision",
        decisionId: next.req.decisionId,
        response: { kind: "optional", accept },
      });
    };

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yuugo").instanceId })).toEqual({ ok: true });
    await answerNextOptional(true); // Yuugo: use the [On Play] effect
    await answerNextOptional(false); // Fei: refuse to suspend (Q5356)
    await settle(() => false, 120);

    const player = s.state.players[0]!;
    expect(declinedFeiPrompt).toBe(true);
    expect(player.security).toHaveLength(1); // the Zaxon card did land face up
    expect(player.security[0]?.faceUp).toBe(true);
    expect(s.perm("fei").isSuspended).toBe(false);
    expect(player.hand.some((card) => card.instanceId === notDrawnId)).toBe(false); // no <Draw 1>
    expect(memoryOf(s, 0)).toBe(1); // 6 - 5, no Fei memory
  });

  it("gains memory but does not draw with 8 cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: FEI, as: "fei" }],
          hand: [{ card: YUUGO, as: "yuugo" }, { card: ZAXON_DIGIMON, as: "zaxon" }, ...Array(8).fill(FILLER)],
          security: [{ card: FILLER, as: "paid" }],
          deck: [{ card: "BT1-011", as: "notDrawn" }, ...Array(9).fill(FILLER)],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const notDrawnId = s.inst("notDrawn").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yuugo").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("fei").isSuspended);
    await settle(() => false, 60);

    const player = s.state.players[0]!;
    // Yuugo left the hand, the Zaxon card left the hand, the paid security card entered: 8 cards.
    expect(player.hand).toHaveLength(9);
    expect(player.hand.some((card) => card.instanceId === notDrawnId)).toBe(false);
    expect(s.perm("fei").isSuspended).toBe(true);
    expect(memoryOf(s, 0)).toBe(2); // 6 - 5 + 1: the memory half still resolved
  });

  it("gains nothing when Fei is already suspended (the 'by' cost is unpayable)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: FEI, as: "fei", suspended: true }],
          hand: [
            { card: YUUGO, as: "yuugo" },
            { card: ZAXON_DIGIMON, as: "zaxon" },
          ],
          security: [{ card: FILLER, as: "paid" }],
          deck: [{ card: "BT1-011", as: "notDrawn" }, ...Array(9).fill(FILLER)],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const notDrawnId = s.inst("notDrawn").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yuugo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    await settle(() => false, 60);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === notDrawnId)).toBe(false);
    expect(memoryOf(s, 0)).toBe(1); // 6 - 5, nothing from Fei
  });

  it("ignores a face-up add whose card has neither [Zaxon] nor [Royal Base]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: FEI, as: "fei" }],
          hand: [{ card: EDEN, as: "eden" }],
          security: [{ card: FILLER, as: "paid" }],
          deck: [{ card: "BT1-011", as: "notDrawn" }, ...Array(9).fill(FILLER)],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const edenId = s.inst("eden").instanceId;
    const notDrawnId = s.inst("notDrawn").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: edenId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === edenId));
    await settle(() => false, 60);

    const player = s.state.players[0]!;
    expect(player.security.some((card) => card.instanceId === edenId && card.faceUp === true)).toBe(true);
    expect(s.perm("fei").isSuspended).toBe(false);
    expect(player.hand.some((card) => card.instanceId === notDrawnId)).toBe(false);
    expect(memoryOf(s, 0)).toBe(4); // 6 - 2 for Cyberspace EDEN, nothing from Fei
  });

  it("ignores a face-up [Zaxon] add to the OPPONENT's security stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: FEI, as: "fei" }],
          deck: [{ card: "BT1-011", as: "notDrawn" }, ...Array(9).fill(FILLER)],
        },
        1: {
          hand: [
            { card: YUUGO, as: "yuugo" },
            { card: ZAXON_DIGIMON, as: "zaxon" },
          ],
          security: [{ card: FILLER, as: "paid" }],
          deck: Array(10).fill(FILLER),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 6;
    const zaxonId = s.inst("zaxon").instanceId;
    const notDrawnId = s.inst("notDrawn").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("yuugo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.some((card) => card.instanceId === zaxonId));
    await settle(() => false, 60);

    expect(s.state.players[1]!.security.some((card) => card.instanceId === zaxonId && card.faceUp === true)).toBe(true);
    expect(s.perm("fei").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === notDrawnId)).toBe(false);
    expect(memoryOf(s, 1)).toBe(1); // only Yuugo's own cost moved memory
  });

  it("plays itself for free when checked from security by an opponent's attack", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: FEI, as: "fei" }],
        deck: Array(10).fill(FILLER),
      },
      1: {
        battleArea: [{ card: PLAIN_DIGIMON, as: "attacker" }],
        hand: [FILLER],
        deck: Array(10).fill(FILLER),
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const feiId = s.inst("fei").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    const memoryBefore = memoryOf(s, 1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === feiId));

    const defender = s.state.players[0]!;
    expect(defender.security).toHaveLength(0);
    expect(defender.battleArea.some((p) => p.topCard?.instanceId === feiId)).toBe(true);
    expect(defender.trash.some((card) => card.instanceId === feiId)).toBe(false);
    // Played "without paying the cost": the security check moved no memory for the defender.
    expect(memoryOf(s, 1)).toBe(memoryBefore);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
