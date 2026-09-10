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

/**
 * EX10-069 Unique Emblem: Gravel Hearts (Black Option, play cost 3, [LIBERATOR]).
 *
 * [Main] You may play 1 [Sunarizamon] or [Close] from your hand or trash without paying the
 *   cost. Then, place this card in the battle area.
 * [Your Turn] When any of your [Close]s suspend, ＜Delay＞
 *   ・1 of your [Mineral] or [Rock] trait Digimon may digivolve into a Digimon card with the
 *     [Mineral] trait and [LIBERATOR] trait in the hand with the digivolution cost reduced by 3.
 * [Security] Activate this card's [Main] effects.
 *
 * Every clause is reached through a public intent or the real turn loop. The [Main] clause is
 * a `playCard` of the Option itself (colour requirement included); the ＜Delay＞ window is
 * reached by a real suspension of a [Close] — playing EX10-028 Landramon pays its [On Play]
 * cost by trashing a [Mineral] digivolution card, which fires EX10-063 Close's own "by
 * suspending this Tamer, gain 1 memory"; the [Security] clause is reached by a real attack
 * that checks security. No injected timing (`advance.fire*`) is used.
 *
 * Fixtures: BT10-062 Golemon is the inert [Mineral] Digimon (no main and no inherited text);
 * BT1-009/BT1-013/BT1-014 are inert main-deck Digimon for decks, security and spare hand cards.
 */
const CLOSE = "EX10-063";
const SUNARIZAMON = "EX10-025";
const LANDRAMON_TRASHER = "EX10-028";
/** EX8-048 Landramon: Black Lv.4, [Mineral] AND [LIBERATOR], digivolves from a black Lv.3 for 2. */
const BOTH_TRAITS = "EX8-048";
/** BT7-061 Gigasmon: Black Lv.4, [Mineral] but NOT [LIBERATOR]; a legal black Lv.3 route for 3. */
const MINERAL_ONLY = "BT7-061";
/** BT18-065 Snatchmon: Black Lv.4, [LIBERATOR] but NOT [Mineral]; a legal black Lv.3 route for 3. */
const LIBERATOR_ONLY = "BT18-065";
const INERT_MINERAL = "BT10-062";
/**
 * BT4-065 Gotsumon: Black Lv.3, [Rock] and nothing else, no main text and no inherited text —
 * the only fully inert [Rock] Lv.3 in the pool, and a legal black Lv.3 base for EX8-048.
 */
const INERT_ROCK = "BT4-065";
/**
 * BT3-060 Psychemon: Black Lv.3, [Reptile] — NEITHER [Mineral] nor [Rock], no main and no
 * inherited text. Its colour and level satisfy EX8-048's own digivolution requirement, so the
 * ＜Delay＞'s base filter is the only thing that can refuse it.
 */
const ILLEGAL_BASE = "BT3-060";
const INERT_DECK = ["BT1-013", "BT1-014", "BT1-009"];

/**
 * The board for every ＜Delay＞ scenario: a [Close] Tamer, a [Mineral] Lv.3 host carrying one
 * inert [Mineral] digivolution card, and in hand the Option, the Landramon whose [On Play]
 * cost trashes that digivolution card, plus whichever hand Digimon the Delay may reach for.
 */
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

/**
 * Answer every `optional` prompt by hand through the public `respondDecision` intent, one at a
 * time, deciding per request. The global `autoAcceptOptional` / `autoDeclineOptional` flags
 * cannot express "accept the [Close] suspension that opens the window, decline the ＜Delay＞
 * itself" because both prompts are optionals; `s.decisions` carries the full `DecisionRequest`
 * (including `sourceCardId`), so the decision can be routed by the card that asked.
 *
 * Returns every optional request answered, so a test can assert that both prompts really were
 * raised rather than that nothing happened.
 */
async function answerOptionals(
  s: EngineSetup,
  accept: (req: DecisionRequest) => boolean,
  rounds = 60,
): Promise<DecisionRequest[]> {
  const answered: DecisionRequest[] = [];
  const seen = new Set<string>();
  for (let round = 0; round < rounds; round += 1) {
    // Not every round yields a fresh decision — the loop is a fixed-budget poll, not a wait on
    // a milestone that is guaranteed to hold, so this drains rather than asserts.
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

/**
 * Play the Option on my first turn and hand the loop back on my NEXT main phase, so §16-17-3
 * no longer bars the ＜Delay＞. Mirrors the inline sequence the ACCEPT-flag tests use.
 */
async function armDelayAcrossTurns(s: EngineSetup, emblemId: string): Promise<void> {
  await advance(s.engine).waitForMainPhase(0);
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
          target: { filter: { nameOrTrait: [{ tokens: ["Sunarizamon", "Close"], match: "name" }] } },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Close"], match: "name" }] },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: true,
              reduceCost: 3,
              optional: true,
              target: { filter: { nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] } },
              // Q5183 needs BOTH traits: `traits` alone is OR-matched, so the conjunction is
              // encoded as the separate `nameOrTrait` and `traits` gates.
              into: { nameOrTrait: [{ tokens: ["Mineral"], match: "trait" }], traits: ["LIBERATOR"] },
            },
          ],
        },
      ],
      // The printed ＜Delay＞ is the encoding; `delayArmedIntrinsic` is synthesized onto the
      // SubTrigger by `withIntrinsicDelayGate` at registration, never carried in the IR.
      keywords: [{ keyword: "Delay" }],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });

  // --- [Main], reached by playing the Option itself ---

  it("plays a hand [Sunarizamon] for free and then places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          // The inert [Mineral] Golemon is Black, so it satisfies the Option's colour requirement.
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
    // Sunarizamon arrived without paying its own cost of 3; only the Option's 3 was charged.
    expect(s.state.memory).toBe(2);
    expect(p0.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("anchor").instanceId,
      sunaId,
      emblemId,
    ]);
    // §17-1-3-2-2 spares an Option placed by an effect; the marker is what keeps it on the board.
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
          // BT1-013 Muchomon is Red, so nothing on the board is Black.
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

  // --- ＜Delay＞, reached by a real [Close] suspension ---

  it("Q5183 digivolves a [Mineral] host into a [Mineral]+[LIBERATOR] hand card for 3 less, and trashes itself", async () => {
    const preferInstanceIds: string[] = [];
    // EX8-048's compiled requirement list carries a trait-gated alternate at the same cost as
    // its printed Black Lv.3 route, so the digivolve asks which requirement to declare.
    // `autoChooseOption` takes option 0, the printed route; both cost 2, so the memory maths
    // below is the same either way.
    const s = setupEngine(delayBoard(BOTH_TRAITS), { ...ACCEPT, autoChooseOption: true, preferInstanceIds });
    await s.ready();
    // Two [Mineral] Digimon exist once Landramon lands; the Delay must reach the Lv.3 host.
    preferInstanceIds.push(s.inst("host").instanceId, s.perm("host").permanentId);
    const loop = s.engine.startTurnLoop();

    // Turn 1 (mine): play the Option. §16-17-3 bars its ＜Delay＞ this turn, so the chain
    // below has to wait for my next turn.
    await advance(s.engine).waitForMainPhase(0);
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

    // Turn 3 (mine again): the Option is no longer "the turn it entered play".
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    const hostTopId = s.inst("host").instanceId;
    const targetId = s.inst("target").instanceId;
    const handBefore = s.state.players[0]!.hand.length;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trasher").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard?.instanceId === targetId && s.state.pendingDecision === undefined);

    const p0 = s.state.players[0]!;
    // 8 - 4 (Landramon) + 1 (Close's own memory gain) - 0 (2 reduced by 3, floored) = 5.
    expect(s.state.memory).toBe(5);
    expect(s.perm("close").isSuspended).toBe(true);
    expect(s.perm("host").topCard!.instanceId).toBe(targetId);
    // The inert [Mineral] fuel was trashed as Landramon's cost, so only the Lv.3 base remains.
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([hostTopId]);
    // §16-17-1: trashing the source card IS the ＜Delay＞ activation cost.
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(emblemId);
    expect(p0.battleArea.some(({ topCard }) => topCard.instanceId === emblemId)).toBe(false);
    // The digivolve drew the usual 1 card; the target left the hand.
    expect(p0.hand.map(({ instanceId }) => instanceId)).not.toContain(targetId);
    expect(p0.hand).toHaveLength(handBefore - 2 + 1);
    expect(p0.deck).toHaveLength(deckBefore - 1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("§16-17-3: the ＜Delay＞ cannot activate on the turn the Option entered play", async () => {
    const s = setupEngine(delayBoard(BOTH_TRAITS), ACCEPT);
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
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

    // Same turn: the [Close] really does suspend, so the window really does open.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trasher").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("close").isSuspended && s.state.pendingDecision === undefined);
    await settle(() => false, 40);

    const p0 = s.state.players[0]!;
    expect(s.perm("close").isSuspended).toBe(true);
    // ... but the Delay stayed unspent: the Option is still on the board and nothing digivolved.
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
      const s = setupEngine(delayBoard(handCard), ACCEPT);
      await s.ready();
      const loop = s.engine.startTurnLoop();

      await advance(s.engine).waitForMainPhase(0);
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
      s.state.memory = 8;
      const hostTopId = s.inst("host").instanceId;
      const targetId = s.inst("target").instanceId;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trasher").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.perm("close").isSuspended && s.state.pendingDecision === undefined);
      await settle(() => false, 40);

      const p0 = s.state.players[0]!;
      // The hand card's own digivolution requirement (black Lv.3 base) IS satisfied, so only
      // the [Mineral] AND [LIBERATOR] conjunction can refuse it.
      expect(s.perm("host").topCard!.instanceId).toBe(hostTopId);
      expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(targetId);
      // An impossible payload never consumes the ＜Delay＞ cost: the Option stays on the board.
      expect(p0.battleArea.some(({ topCard }) => topCard.instanceId === emblemId)).toBe(true);
      expect(p0.trash.map(({ instanceId }) => instanceId)).not.toContain(emblemId);
      // 8 - 4 (Landramon) + 1 (Close) = 5: the chain ran, only the digivolve did not.
      expect(s.state.memory).toBe(5);
      expect(s.state.pendingDecision).toBeUndefined();

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });
  }

  it("hand-answered: accepting the [Close] suspension but declining the ＜Delay＞ leaves the Option in play", async () => {
    // No `autoAcceptOptional` / `autoDeclineOptional`: both optionals are answered one at a
    // time through the public `respondDecision` intent, routed by `DecisionRequest.sourceCardId`.
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
    // Accept everything except EX10-069's own ＜Delay＞ ask.
    const answered = await answerOptionals(s, ({ sourceCardId }) => sourceCardId !== CARD_ID);
    await settle(() => false, 40);

    // Both nested prompts really were raised: Close's "by suspending this Tamer" cost, which
    // opens the window, and the ＜Delay＞'s own "trash this card to activate" ask.
    const askedBy = answered.map(({ sourceCardId }) => sourceCardId);
    expect(askedBy).toContain(CLOSE);
    expect(askedBy).toContain(CARD_ID);

    const p0 = s.state.players[0]!;
    // The suspension was accepted, so the window did open ...
    expect(s.perm("close").isSuspended).toBe(true);
    // ... and the decline left the ＜Delay＞ unspent: no §16-17-1 trash cost was paid.
    expect(p0.battleArea.some(({ topCard }) => topCard.instanceId === emblemId)).toBe(true);
    expect(p0.trash.map(({ instanceId }) => instanceId)).not.toContain(emblemId);
    // Nothing digivolved: the host keeps its own top card and the hand card stayed put.
    expect(s.perm("host").topCard!.instanceId).toBe(hostTopId);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(targetId);
    // Only Landramon left the hand; no digivolution draw happened.
    expect(p0.hand).toHaveLength(handBefore - 1);
    expect(p0.deck).toHaveLength(deckBefore);
    // 8 - 4 (Landramon) + 1 (Close's accepted suspension) = 5; the declined Delay costs nothing.
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("the [Rock] half of the base filter is live: a [Rock] Lv.3 host digivolves for 3 less", async () => {
    // BT4-065 Gotsumon carries [Rock] and NOT [Mineral], so only the `Rock` token of the
    // ＜Delay＞'s base filter can admit it. It is fully inert (no main, no inherited text), and
    // EX8-048 digivolves from any black Lv.3 for 2, so the route is legal and unassisted.
    const preferInstanceIds: string[] = [];
    const s = setupEngine(delayBoard(BOTH_TRAITS, INERT_ROCK), { ...ACCEPT, preferInstanceIds });
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
    await settle(() => s.perm("host").topCard?.instanceId === targetId && s.state.pendingDecision === undefined);

    const p0 = s.state.players[0]!;
    // 8 - 4 (Landramon) + 1 (Close) - 0 (EX8-048's cost of 2 reduced by 3, floored) = 5.
    expect(s.state.memory).toBe(5);
    expect(s.perm("close").isSuspended).toBe(true);
    expect(s.perm("host").topCard!.instanceId).toBe(targetId);
    // The [Mineral] fuel was trashed as Landramon's cost, so only the [Rock] Lv.3 base remains.
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
    // The window still opens: BT10-062 Golemon is [Mineral], so trashing the [Rock] card from
    // ITS digivolution cards fires Close. But no legal base exists for EX8-048 (black Lv.3):
    // Golemon and the played Landramon are Lv.4, and BT3-060 Psychemon — the one black Lv.3 on
    // the board — carries neither [Mineral] nor [Rock]. `preferInstanceIds` biases the
    // selection toward Psychemon, so dropping the base filter would digivolve it.
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
      { ...ACCEPT, preferInstanceIds },
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
    await settle(() => s.perm("close").isSuspended && s.state.pendingDecision === undefined);
    await settle(() => false, 40);

    const p0 = s.state.players[0]!;
    // The [Rock] fuel really was trashed and Close really did suspend, so the window opened.
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("fuel").instanceId);
    expect(s.perm("close").isSuspended).toBe(true);
    // Nothing digivolved: the trait-illegal Lv.3 kept its top card, as did the [Mineral] Lv.4.
    expect(s.perm("illegal").topCard!.instanceId).toBe(illegalTopId);
    expect(s.perm("illegal").stack).toHaveLength(0);
    expect(s.perm("trigger").topCard!.instanceId).toBe(triggerTopId);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(targetId);
    expect(p0.deck).toHaveLength(deckBefore);
    // An impossible payload never consumes the ＜Delay＞ cost: the Option stays on the board.
    expect(p0.battleArea.some(({ topCard }) => topCard.instanceId === emblemId)).toBe(true);
    expect(p0.trash.map(({ instanceId }) => instanceId)).not.toContain(emblemId);
    // 8 - 4 (Landramon) + 1 (Close) = 5: the chain ran, only the digivolve did not.
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores a suspension that is not a [Close]", async () => {
    // No [Close] on the board at all: the same Landramon play suspends nothing, so the
    // watcher's `sourceFilter` has nothing to match and the Option survives untouched.
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
    s.state.memory = 8;
    const hostTopId = s.inst("host").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trasher").instanceId })).toEqual({
      ok: true,
    });
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

  // --- [Security], reached by a real security check ---

  it("[Security] activates the [Main] effects when a real attack checks it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
          deck: INERT_DECK,
        },
        1: {
          // No ＜Blocker＞ on the defending side, so the block window closes on its own.
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
    // Both halves of the [Main] clause ran for the defending owner: the free [Sunarizamon]
    // play and the mandatory self-placement.
    expect(p1.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([sunaId, emblemId]);
    expect(p1.battleArea.find(({ topCard }) => topCard.instanceId === emblemId)!.placedByEffect).toBe(true);
    expect(p1.hand).toHaveLength(0);
    expect(p1.trash.map(({ instanceId }) => instanceId)).not.toContain(emblemId);
    expect(p1.security).toHaveLength(0);
    // The Security activation charges no play cost to either side.
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
