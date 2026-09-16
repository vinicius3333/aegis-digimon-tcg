import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { type BoardSpec, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-083.js";

const FEI = "BT23-083";
const YUUGO = "BT23-086";
const EDEN = "BT22-100";
const ZAXON_DIGIMON = "BT23-015";
const CS_DIGIMON = "BT23-045";
const PLAIN_DIGIMON = "BT1-009";
const FILLER = "BT1-010";

function memoryOf(s: EngineSetup, seat: 0 | 1): number {
  return s.state.turnSeat === seat ? s.state.memory : -s.state.memory;
}

async function memoryAtOwnMain(board: BoardSpec): Promise<number> {
  const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true });
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === "Breeding" || s.state.phase === "Main", 400);
  const skipped = s.state.phase === "Breeding" ? s.engine.applyIntent(0, { type: "endPhase" }) : { ok: true };
  expect(skipped).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const memory = memoryOf(s, 0);
  expect(s.state.pendingDecision).toBeUndefined();
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
  return memory;
}

async function reachOpponentMain(s: EngineSetup): Promise<void> {
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
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

    const startMain = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(startMain?.actions[0]).toMatchObject({
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

    type SubTriggerShape = { actions: { kind: string; amount?: number; condition?: unknown; optional?: boolean }[] };
    const watcher = compiled.effects.find((entry) => entry.trigger === "AllTurns")!
      .actions[0] as unknown as SubTriggerShape;
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

  it("gains exactly 1 memory at the start of its controller's main phase with a [Royal Base]/[CS] Digimon out", async () => {
    const withCs = await memoryAtOwnMain({
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
    const withoutCs = await memoryAtOwnMain({
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

    expect(withCs).toBe(withoutCs + 1);
  });

  it("counts a [Royal Base] trait Digimon and ignores [Royal Knight] and a text-only carrier", async () => {
    const nearMissesOnly = await memoryAtOwnMain({
      0: {
        battleArea: [
          { card: FEI, as: "fei" },
          { card: "BT13-040", as: "royalKnight" },
          { card: "BT1-009", as: "plain" },
        ],
        hand: [FILLER],
        deck: Array(10).fill(FILLER),
      },
      1: { hand: [FILLER], deck: Array(10).fill(FILLER) },
    });
    const withRoyalBase = await memoryAtOwnMain({
      0: {
        battleArea: [
          { card: FEI, as: "fei" },
          { card: "BT13-040", as: "royalKnight" },
          { card: "BT18-044", as: "royalBase" },
        ],
        hand: [FILLER],
        deck: Array(10).fill(FILLER),
      },
      1: { hand: [FILLER], deck: Array(10).fill(FILLER) },
    });

    expect(withRoyalBase).toBe(nearMissesOnly + 1);
  });

  it("does not count a Tamer that carries [Royal Base] only in its effect text", async () => {
    const twoFei = await memoryAtOwnMain({
      0: {
        battleArea: [
          { card: FEI, as: "fei" },
          { card: FEI, as: "secondFei" },
        ],
        hand: [FILLER],
        deck: Array(10).fill(FILLER),
      },
      1: { hand: [FILLER], deck: Array(10).fill(FILLER) },
    });
    const empty = await memoryAtOwnMain({
      0: {
        battleArea: [{ card: FEI, as: "fei" }],
        hand: [FILLER],
        deck: Array(10).fill(FILLER),
      },
      1: { hand: [FILLER], deck: Array(10).fill(FILLER) },
    });

    expect(twoFei).toBe(empty);
  });

  it("stays silent at the opponent's start of main phase", async () => {
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
    const loop = s.engine.startTurnLoop();
    await reachOpponentMain(s);

    expect(memoryOf(s, 1)).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not count a [CS] Digimon in the breeding area (CR 3-4-5-3)", async () => {
    const breedingOnly = await memoryAtOwnMain({
      0: {
        battleArea: [{ card: FEI, as: "fei" }],
        breeding: { card: CS_DIGIMON, as: "hatched" },
        hand: [FILLER],
        deck: Array(10).fill(FILLER),
      },
      1: { hand: [FILLER], deck: Array(10).fill(FILLER) },
    });
    const empty = await memoryAtOwnMain({
      0: {
        battleArea: [{ card: FEI, as: "fei" }],
        hand: [FILLER],
        deck: Array(10).fill(FILLER),
      },
      1: { hand: [FILLER], deck: Array(10).fill(FILLER) },
    });

    expect(breedingOnly).toBe(empty);
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
    expect(player.hand.map((card) => card.instanceId)).toContain(paidId);
    expect(player.hand.map((card) => card.instanceId)).toContain(drawnId);
    expect(s.perm("fei").isSuspended).toBe(true);
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
    await answerNextOptional(true);
    await answerNextOptional(false);
    await settle(() => false, 120);

    const player = s.state.players[0]!;
    expect(declinedFeiPrompt).toBe(true);
    expect(player.security).toHaveLength(1);
    expect(player.security[0]?.faceUp).toBe(true);
    expect(s.perm("fei").isSuspended).toBe(false);
    expect(player.hand.some((card) => card.instanceId === notDrawnId)).toBe(false);
    expect(memoryOf(s, 0)).toBe(1);
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
    expect(player.hand).toHaveLength(9);
    expect(player.hand.some((card) => card.instanceId === notDrawnId)).toBe(false);
    expect(s.perm("fei").isSuspended).toBe(true);
    expect(memoryOf(s, 0)).toBe(2);
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
    expect(memoryOf(s, 0)).toBe(1);
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
    expect(memoryOf(s, 0)).toBe(4);
  });

  it("ignores a face-up [Zaxon] add to the OPPONENT's security stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: FEI, as: "fei" }],
          hand: [FILLER],
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
    const zaxonId = s.inst("zaxon").instanceId;
    const notDrawnId = s.inst("notDrawn").instanceId;
    const loop = s.engine.startTurnLoop();
    await reachOpponentMain(s);
    s.state.memory = 6;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("yuugo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.some((card) => card.instanceId === zaxonId));
    await settle(() => false, 60);

    expect(s.state.players[1]!.security.some((card) => card.instanceId === zaxonId && card.faceUp === true)).toBe(true);
    expect(s.perm("fei").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === notDrawnId)).toBe(false);
    expect(memoryOf(s, 1)).toBe(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays itself for free when checked from security by an opponent's attack", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: FEI, as: "fei" }],
        hand: [FILLER],
        deck: Array(10).fill(FILLER),
      },
      1: {
        battleArea: [{ card: PLAIN_DIGIMON, as: "attacker" }],
        hand: [FILLER],
        deck: Array(10).fill(FILLER),
      },
    });
    const feiId = s.inst("fei").instanceId;
    const loop = s.engine.startTurnLoop();
    await reachOpponentMain(s);
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
    expect(memoryOf(s, 1)).toBe(memoryBefore);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
