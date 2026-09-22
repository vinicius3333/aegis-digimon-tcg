import { getCardDefinition, type DecisionRequest } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  drainMicrotasks,
  setupEngine,
  settle,
  type BoardSpec,
  type EngineSetup,
  type SetupEngineOptions,
} from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-069.js";
import "../index.js";

const CARD_ID = "EX10-069";

const CLOSE = "EX10-063";
const SUNARIZAMON = "EX10-025";
const LANDRAMON_TRASHER = "EX10-028";
const BOTH_TRAITS = "EX8-048";
const MINERAL_ONLY = "BT7-061";
const LIBERATOR_ONLY = "BT18-065";
const INERT_MINERAL = "BT10-062";
const INERT_ROCK = "BT4-065";
const ILLEGAL_BASE = "BT3-060";
const INERT_DECK = ["BT1-013", "BT1-014", "BT1-009"];

function delayBoard(handTarget: string | undefined, hostCard: string = SUNARIZAMON): BoardSpec {
  return {
    0: {
      battleArea: [
        { card: CLOSE, as: "close" },
        { card: hostCard, as: "host", under: [{ card: INERT_MINERAL, as: "fuel" }] },
      ],
      hand: [
        { card: CARD_ID, as: "emblem" },
        { card: LANDRAMON_TRASHER, as: "trasher" },
        ...(handTarget === undefined ? [] : [{ card: handTarget, as: "target" }]),
      ],
      deck: INERT_DECK,
      security: ["BT1-009", "BT1-010"],
    },
    1: { deck: INERT_DECK, hand: ["BT1-013"], security: ["BT1-009", "BT1-010"] },
  };
}

const ACCEPT: SetupEngineOptions = { autoAcceptOptional: true, autoSelectCards: true };
const SELECT: SetupEngineOptions = { autoSelectCards: true };

async function answerOptionals(
  s: EngineSetup,
  accept: (req: DecisionRequest) => boolean,
  rounds = 60,
): Promise<DecisionRequest[]> {
  const answered: DecisionRequest[] = [];
  const seen = new Set<string>();
  for (let round = 0; round < rounds; round += 1) {
    await drainMicrotasks(4);
    const pending = s.state.pendingDecision;
    if (pending === undefined || seen.has(pending.decisionId)) continue;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)?.req;
    if (request === undefined || request.kind !== "optional") continue;
    seen.add(request.decisionId);
    answered.push(request);
    expect(
      s.engine.applyIntent(request.seat, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "optional", accept: accept(request) },
      }),
    ).toEqual({ ok: true });
  }
  return answered;
}

async function armDelayAcrossTurns(s: EngineSetup, emblemId: string): Promise<void> {
  await advance(s.engine).waitForMainPhase(0);
  await answerOptionals(s, ({ sourceCardId }) => sourceCardId !== CLOSE);
  s.state.memory = 8;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: emblemId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === emblemId) &&
      s.state.pendingDecision === undefined,
  );
  advance(s.engine).endMainPhaseIfOpen(0);
  await advance(s.engine).waitForMainPhase(1);
  advance(s.engine).endMainPhaseIfOpen(1);
  await advance(s.engine).waitForMainPhase(0);
  await answerOptionals(s, ({ sourceCardId }) => sourceCardId !== CLOSE);
  s.state.memory = 8;
}

describe("EX10-069 Unique Emblem: Gravel Hearts", () => {
  it("matches every catalog field and the compiled clause set", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Unique Emblem: Gravel Hearts",
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 3,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Activate this card's [Main] effects.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find(({ trigger }) => trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: { filter: { nameOrTrait: [{ tokens: ["Sunarizamon", "Close"], match: "nameExact" }] } },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Close"], match: "nameExact" }] },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: true,
              reduceCost: 3,
              optional: true,
              target: { filter: { nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] } },
              into: { nameOrTrait: [{ tokens: ["Mineral"], match: "trait" }], traits: ["LIBERATOR"] },
            },
          ],
        },
      ],
      keywords: [{ keyword: "Delay" }],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });

  it("plays a hand [Sunarizamon] for free and then places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: INERT_MINERAL, as: "anchor" }],
          hand: [
            { card: CARD_ID, as: "emblem" },
            { card: SUNARIZAMON, as: "suna" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK },
      },
      ACCEPT,
    );
    await s.ready();
    s.state.memory = 5;
    const emblemId = s.inst("emblem").instanceId;
    const sunaId = s.inst("suna").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: emblemId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === emblemId) &&
        s.state.pendingDecision === undefined,
    );

    const p0 = s.state.players[0]!;
    expect(s.state.memory).toBe(2);
    expect(p0.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("anchor").instanceId,
      sunaId,
      emblemId,
    ]);
    expect(p0.battleArea.find(({ topCard }) => topCard.instanceId === emblemId)!.placedByEffect).toBe(true);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(p0.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("also reaches the TRASH, and [Close] is a second legal free play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: INERT_MINERAL, as: "anchor" }],
          hand: [
            { card: CARD_ID, as: "emblem" },
            { card: "BT1-013", as: "spare" },
          ],
          trash: [{ card: CLOSE, as: "close" }],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK },
      },
      ACCEPT,
    );
    await s.ready();
    s.state.memory = 5;
    const emblemId = s.inst("emblem").instanceId;
    const closeId = s.inst("close").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: emblemId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === emblemId) &&
        s.state.pendingDecision === undefined,
    );

    const p0 = s.state.players[0]!;
    expect(s.state.memory).toBe(2);
    expect(p0.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("anchor").instanceId,
      closeId,
      emblemId,
    ]);
    expect(p0.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it('"You may": declining the free play still places the Option — the "Then" is mandatory', async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: INERT_MINERAL, as: "anchor" }],
          hand: [
            { card: CARD_ID, as: "emblem" },
            { card: SUNARIZAMON, as: "suna" },
          ],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const emblemId = s.inst("emblem").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: emblemId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === emblemId) &&
        s.state.pendingDecision === undefined,
    );

    const p0 = s.state.players[0]!;
    expect(s.state.memory).toBe(2);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("suna").instanceId]);
    expect(p0.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([s.inst("anchor").instanceId, emblemId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the play with no Black card in play: the colour requirement is real", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "red" }],
          hand: [
            { card: CARD_ID, as: "emblem" },
            { card: SUNARIZAMON, as: "suna" },
          ],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK },
      },
      ACCEPT,
    );
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emblem").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    await settle(() => false, 30);

    const p0 = s.state.players[0]!;
    expect(s.state.memory).toBe(5);
    expect(p0.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([s.inst("red").instanceId]);
    expect(p0.hand).toHaveLength(2);
  });

  it("Q5183 digivolves a [Mineral] host into a [Mineral]+[LIBERATOR] hand card for 3 less, and trashes itself", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(delayBoard(BOTH_TRAITS), { ...SELECT, autoChooseOption: true, preferInstanceIds });
    await s.ready();
    preferInstanceIds.push(s.inst("host").instanceId, s.perm("host").permanentId);
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    await answerOptionals(s, () => false);
    s.state.memory = 8;
    const emblemId = s.inst("emblem").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: emblemId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === emblemId) &&
        s.state.pendingDecision === undefined,
    );

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    await advance(s.engine).waitForMainPhase(0);
    await answerOptionals(s, () => false);
    s.state.memory = 8;
    const hostTopId = s.inst("host").instanceId;
    const targetId = s.inst("target").instanceId;
    const handBefore = s.state.players[0]!.hand.length;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trasher").instanceId })).toEqual({
      ok: true,
    });
    await answerOptionals(s, () => true);
    await settle(() => s.perm("host").topCard?.instanceId === targetId && s.state.pendingDecision === undefined);

    const p0 = s.state.players[0]!;
    expect(s.state.memory).toBe(5);
    expect(s.perm("close").isSuspended).toBe(true);
    expect(s.perm("host").topCard!.instanceId).toBe(targetId);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([hostTopId]);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(emblemId);
    expect(p0.battleArea.some(({ topCard }) => topCard.instanceId === emblemId)).toBe(false);
    expect(p0.hand.map(({ instanceId }) => instanceId)).not.toContain(targetId);
    expect(p0.hand).toHaveLength(handBefore - 2 + 1);
    expect(p0.deck).toHaveLength(deckBefore - 1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("§16-17-3: the ＜Delay＞ cannot activate on the turn the Option entered play", async () => {
    const s = setupEngine(delayBoard(BOTH_TRAITS), SELECT);
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await answerOptionals(s, () => false);
    s.state.memory = 10;
    const emblemId = s.inst("emblem").instanceId;
    const hostTopId = s.inst("host").instanceId;
    const targetId = s.inst("target").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: emblemId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === emblemId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trasher").instanceId })).toEqual({
      ok: true,
    });
    await answerOptionals(s, () => true);
    await settle(() => s.perm("close").isSuspended && s.state.pendingDecision === undefined);
    await settle(() => false, 40);

    const p0 = s.state.players[0]!;
    expect(s.perm("close").isSuspended).toBe(true);
    expect(p0.battleArea.some(({ topCard }) => topCard.instanceId === emblemId)).toBe(true);
    expect(p0.trash.map(({ instanceId }) => instanceId)).not.toContain(emblemId);
    expect(s.perm("host").topCard!.instanceId).toBe(hostTopId);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(targetId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  for (const [label, handCard] of [
    ["[Mineral] but no [LIBERATOR]", MINERAL_ONLY],
    ["[LIBERATOR] but no [Mineral]", LIBERATOR_ONLY],
  ] as const) {
    it(`Q5183 refuses a hand Digimon with ${label}, leaving the ＜Delay＞ unspent`, async () => {
      const s = setupEngine(delayBoard(handCard), SELECT);
      await s.ready();
      const loop = s.engine.startTurnLoop();

      await advance(s.engine).waitForMainPhase(0);
      await answerOptionals(s, () => false);
      s.state.memory = 8;
      const emblemId = s.inst("emblem").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: emblemId })).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === emblemId) &&
          s.state.pendingDecision === undefined,
      );
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      advance(s.engine).endMainPhaseIfOpen(1);
      await advance(s.engine).waitForMainPhase(0);
      await answerOptionals(s, () => false);
      s.state.memory = 8;
      const hostTopId = s.inst("host").instanceId;
      const targetId = s.inst("target").instanceId;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trasher").instanceId })).toEqual({
        ok: true,
      });
      await answerOptionals(s, () => true);
      await settle(() => s.perm("close").isSuspended && s.state.pendingDecision === undefined);
      await settle(() => false, 40);

      const p0 = s.state.players[0]!;
      expect(s.perm("host").topCard!.instanceId).toBe(hostTopId);
      expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(targetId);
      expect(p0.battleArea.some(({ topCard }) => topCard.instanceId === emblemId)).toBe(true);
      expect(p0.trash.map(({ instanceId }) => instanceId)).not.toContain(emblemId);
      expect(s.state.memory).toBe(5);
      expect(s.state.pendingDecision).toBeUndefined();

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });
  }

  it("hand-answered: accepting the [Close] suspension but declining the ＜Delay＞ leaves the Option in play", async () => {
    const s = setupEngine(delayBoard(BOTH_TRAITS), { autoSelectCards: true });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    const emblemId = s.inst("emblem").instanceId;
    await armDelayAcrossTurns(s, emblemId);

    const hostTopId = s.inst("host").instanceId;
    const targetId = s.inst("target").instanceId;
    const handBefore = s.state.players[0]!.hand.length;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trasher").instanceId })).toEqual({
      ok: true,
    });
    const answered = await answerOptionals(s, ({ sourceCardId }) => sourceCardId !== CARD_ID);
    await settle(() => false, 40);

    const askedBy = answered.map(({ sourceCardId }) => sourceCardId);
    expect(askedBy).toContain(CLOSE);
    expect(askedBy).toContain(CARD_ID);

    const p0 = s.state.players[0]!;
    expect(s.perm("close").isSuspended).toBe(true);
    expect(p0.battleArea.some(({ topCard }) => topCard.instanceId === emblemId)).toBe(true);
    expect(p0.trash.map(({ instanceId }) => instanceId)).not.toContain(emblemId);
    expect(s.perm("host").topCard!.instanceId).toBe(hostTopId);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(targetId);
    expect(p0.hand).toHaveLength(handBefore - 1);
    expect(p0.deck).toHaveLength(deckBefore);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("the [Rock] half of the base filter is live: a [Rock] Lv.3 host digivolves for 3 less", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(delayBoard(BOTH_TRAITS, INERT_ROCK), { ...SELECT, preferInstanceIds });
    await s.ready();
    preferInstanceIds.push(s.inst("host").instanceId, s.perm("host").permanentId);
    const loop = s.engine.startTurnLoop();
    const emblemId = s.inst("emblem").instanceId;
    await armDelayAcrossTurns(s, emblemId);

    const hostTopId = s.inst("host").instanceId;
    const targetId = s.inst("target").instanceId;
    const handBefore = s.state.players[0]!.hand.length;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trasher").instanceId })).toEqual({
      ok: true,
    });
    await answerOptionals(s, () => true);
    await settle(() => s.perm("host").topCard?.instanceId === targetId && s.state.pendingDecision === undefined);

    const p0 = s.state.players[0]!;
    expect(s.state.memory).toBe(5);
    expect(s.perm("close").isSuspended).toBe(true);
    expect(s.perm("host").topCard!.instanceId).toBe(targetId);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([hostTopId]);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(emblemId);
    expect(p0.battleArea.some(({ topCard }) => topCard.instanceId === emblemId)).toBe(false);
    expect(p0.hand.map(({ instanceId }) => instanceId)).not.toContain(targetId);
    expect(p0.hand).toHaveLength(handBefore - 2 + 1);
    expect(p0.deck).toHaveLength(deckBefore - 1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses an illegal base: a Digimon with neither [Mineral] nor [Rock] cannot take the ＜Delay＞ digivolve", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CLOSE, as: "close" },
            { card: INERT_MINERAL, as: "trigger", under: [{ card: INERT_ROCK, as: "fuel" }] },
            { card: ILLEGAL_BASE, as: "illegal" },
          ],
          hand: [
            { card: CARD_ID, as: "emblem" },
            { card: LANDRAMON_TRASHER, as: "trasher" },
            { card: BOTH_TRAITS, as: "target" },
          ],
          deck: INERT_DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: { deck: INERT_DECK, hand: ["BT1-013"], security: ["BT1-009", "BT1-010"] },
      },
      { ...SELECT, preferInstanceIds },
    );
    await s.ready();
    preferInstanceIds.push(s.inst("illegal").instanceId, s.perm("illegal").permanentId);
    const loop = s.engine.startTurnLoop();
    const emblemId = s.inst("emblem").instanceId;
    await armDelayAcrossTurns(s, emblemId);

    const illegalTopId = s.inst("illegal").instanceId;
    const triggerTopId = s.inst("trigger").instanceId;
    const targetId = s.inst("target").instanceId;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trasher").instanceId })).toEqual({
      ok: true,
    });
    await answerOptionals(s, () => true);
    await settle(() => s.perm("close").isSuspended && s.state.pendingDecision === undefined);
    await settle(() => false, 40);

    const p0 = s.state.players[0]!;
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("fuel").instanceId);
    expect(s.perm("close").isSuspended).toBe(true);
    expect(s.perm("illegal").topCard!.instanceId).toBe(illegalTopId);
    expect(s.perm("illegal").stack).toHaveLength(0);
    expect(s.perm("trigger").topCard!.instanceId).toBe(triggerTopId);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(targetId);
    expect(p0.deck).toHaveLength(deckBefore);
    expect(p0.battleArea.some(({ topCard }) => topCard.instanceId === emblemId)).toBe(true);
    expect(p0.trash.map(({ instanceId }) => instanceId)).not.toContain(emblemId);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores a suspension that is not a [Close]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SUNARIZAMON, as: "host", under: [{ card: INERT_MINERAL, as: "fuel" }] }],
          hand: [
            { card: CARD_ID, as: "emblem" },
            { card: LANDRAMON_TRASHER, as: "trasher" },
            { card: BOTH_TRAITS, as: "target" },
          ],
          deck: INERT_DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: { deck: INERT_DECK, hand: ["BT1-013"], security: ["BT1-009", "BT1-010"] },
      },
      ACCEPT,
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    await answerOptionals(s, () => false);
    s.state.memory = 8;
    const emblemId = s.inst("emblem").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: emblemId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === emblemId) &&
        s.state.pendingDecision === undefined,
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    await answerOptionals(s, () => false);
    s.state.memory = 8;
    const hostTopId = s.inst("host").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trasher").instanceId })).toEqual({
      ok: true,
    });
    await answerOptionals(s, () => true);
    await settle(() => s.perm("host").stack.length === 0 && s.state.pendingDecision === undefined);
    await settle(() => false, 40);

    const p0 = s.state.players[0]!;
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("fuel").instanceId);
    expect(s.perm("host").topCard!.instanceId).toBe(hostTopId);
    expect(p0.battleArea.some(({ topCard }) => topCard.instanceId === emblemId)).toBe(true);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Security] activates the [Main] effects when a real attack checks it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
          deck: INERT_DECK,
        },
        1: {
          security: [{ card: CARD_ID, as: "emblem" }],
          hand: [{ card: SUNARIZAMON, as: "suna" }],
          deck: INERT_DECK,
        },
      },
      ACCEPT,
    );
    await s.ready();
    const emblemId = s.inst("emblem").instanceId;
    const sunaId = s.inst("suna").instanceId;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);
    await settle(() => false, 40);

    const p1 = s.state.players[1]!;
    expect(p1.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([sunaId, emblemId]);
    expect(p1.battleArea.find(({ topCard }) => topCard.instanceId === emblemId)!.placedByEffect).toBe(true);
    expect(p1.hand).toHaveLength(0);
    expect(p1.trash.map(({ instanceId }) => instanceId)).not.toContain(emblemId);
    expect(p1.security).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
