import { EffectTiming, getCardDefinition, type CardInstance } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-061.js";
import "../index.js";

const CARD_ID = "EX10-061";

/** A blue and a green face-up security card keep the played [Dark Masters] cards' own
 * [On Deletion] "place yourself face up in security" clause dormant, so a turn-end deletion
 * this card owns can be asserted in the trash instead of racing another card's replacement. */
const COLOR_GUARD = [
  { card: "BT1-038", faceUp: true },
  { card: "BT1-080", faceUp: true },
];

/**
 * The [Hand] [Main] reduced-cost play printed on every EX10 [Dark Masters] Lv.6. Read through
 * the Test Seam's `cardSource` affordance, so the key comes from the same production
 * collection the client sees rather than a cast into the engine.
 */
function reducedCostPlayEffectKey(s: EngineSetup, instance: CardInstance, cardId: string): string {
  const found = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(instance)).find(({ effectKey }) =>
    effectKey.startsWith(`${cardId}/`),
  );
  if (found === undefined) throw new Error(`${cardId} surfaces no [Hand][Main] activated effect`);
  return found.effectKey;
}

const FILLER_DECK = ["BT1-013", "BT1-014", "BT1-009", "BT1-012", "BT1-013", "BT1-014"];

describe("EX10-061 Apocalymon — catalog and IR", () => {
  it("records the exact catalog, alternate evolution, and complete contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["White"],
      level: 7,
      playCost: 17,
      dp: 16000,
      evoCosts: [],
      forms: ["Mega"],
      attributes: ["Unknown"],
      types: ["Unidentified"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 6, traits: ["Dark Masters"], cost: 5, isAlternate: true }],
    });
    expect(compiled.effects?.find(({ trigger }) => trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          cost: {
            kind: "place",
            optional: true,
            target: { filter: { zone: "security", faceUp: true }, count: "all", distinctNames: true },
          },
          actions: [{ kind: "Replacement", mode: "reduceCost", amountPerPlaced: 4 }],
        },
      ],
    });
    // Both printed timings carry the same three-step body: play, Rush, delayed delete.
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlayWithoutCost",
            payCost: false,
            optional: true,
            from: ["digivolutionCards"],
            target: { count: "all", distinctNames: true },
          },
          { kind: "GainKeyword", keyword: { keyword: "Rush" }, duration: "forTheTurn", target: { count: "all" } },
          { kind: "DelayedDelete" },
        ],
      });
    }
  });
});

describe("EX10-061 Apocalymon — [When this card would be played] cost reduction", () => {
  // Q5783: a single face-up [Dark Masters] card in security is a legal payment on its own.
  // The whole chain is public: play from hand -> place -> reduced cost -> [On Play] plays the
  // placed card back out (Q5785) -> ＜Rush＞ -> the real turn loop deletes it (Q5741).
  it("Q5783/Q5785/Q5741: places the single face-up card, pays 13, plays it out, deletes it at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "apocalymon" }, "BT1-013"],
          deck: FILLER_DECK,
          security: [
            { card: "EX10-012", as: "metal", faceUp: true },
            { card: "BT1-009", as: "faceDown" },
            ...COLOR_GUARD,
          ],
        },
        1: { deck: FILLER_DECK, security: ["BT1-009", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Memory must cover the reduced cost outright: a play is refused when its cost exceeds
    // `memory - MEMORY_MIN`, so 13 buys exactly the reduced play and lands on 0.
    s.state.memory = 13;
    const securityBefore = s.state.players[0]!.security.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("apocalymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    // 17 printed - 4 for the one placed card = 13.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore - 1);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).not.toContain(s.inst("metal").instanceId);

    const apocalymon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-012")!;
    // The placed card became a digivolution card and the [On Play] played it straight back out,
    // so nothing is left underneath.
    expect(apocalymon.stack).toHaveLength(0);
    expect(played.stack).toHaveLength(0);
    // "all of your [Dark Masters] trait Digimon" — Apocalymon itself is [Unidentified].
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(apocalymon, "Rush")).toBe(false);

    const playedId = played.permanentId;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([apocalymon.permanentId]);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === playedId)).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX10-012");

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Q5784/Q5786: with two different names available the payment is all-or-nothing across
  // NAMES — the controller may not place only one of them. The engine never offers that
  // choice: the only card selection it raises is the min:1/max:1 tie-break INSIDE one name
  // group (which [MetalSeadramon] to place), so a subset of the distinct names is unreachable.
  it("Q5784/Q5786: places one of EACH distinct name, pays 9, and never offers a smaller subset", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "apocalymon" }],
          deck: FILLER_DECK,
          security: [
            { card: "EX10-012", as: "metal", faceUp: true },
            { card: "BT15-031", as: "duplicateMetal", faceUp: true },
            { card: "EX10-020", as: "puppet", faceUp: true },
            { card: "BT1-009", as: "faceDown" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("apocalymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    // 17 printed - 4 x 2 distinct names = 9.
    expect(s.state.memory).toBe(-9);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual([
      "EX10-012",
      "EX10-020",
      CARD_ID,
    ]);
    // The second [MetalSeadramon] stays in security: one card per NAME, not per card.
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("duplicateMetal").instanceId,
      s.inst("faceDown").instanceId,
    ]);
    expect(s.perm("apocalymon").stack).toHaveLength(0);

    const selections = s.decisions.filter(({ req }) => req.kind === "selectCards");
    expect(selections.length).toBeGreaterThan(0);
    expect(selections.every(({ req }) => req.options?.min === 1 && req.options?.max === 1)).toBe(true);
  });

  // The other half of Q5784/Q5786: "if you don't process this effect, you don't place any
  // cards". Declining the optional prompt leaves security untouched and pays the printed 17.
  it("Q5784/Q5786: declining the optional cost places nothing and pays the full 17", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "apocalymon" }],
          deck: FILLER_DECK,
          security: [
            { card: "EX10-012", as: "metal", faceUp: true },
            { card: "EX10-020", as: "puppet", faceUp: true },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    // The full 17 is only affordable from 7 (memory floor -10), which is the point: the play
    // still happens, at the printed cost, with nothing placed.
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("apocalymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(-10);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("metal").instanceId,
      s.inst("puppet").instanceId,
    ]);
    expect(s.perm("apocalymon").stack).toHaveLength(0);
  });
});

describe("EX10-061 Apocalymon — [When Digivolving] through the real evolution route", () => {
  // The alternate requirement is the ONLY route (evoCosts is empty): Lv.6 w/[Dark Masters],
  // cost 5. The [When Digivolving] body then plays the host out of the digivolution cards
  // (Q5785), Rushes every [Dark Masters] Digimon, and the real turn loop deletes only the
  // Digimon this effect played (Q5741) while the ＜Rush＞ grant expires with the turn.
  it("digivolves from a Lv.6 [Dark Masters] host for 5, refuses a non-[Dark Masters] Lv.6", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-012", as: "host" },
            { card: "EX10-020", as: "resident" },
            { card: "BT1-009", as: "plain" },
            { card: "BT2-064", as: "wrongHost" },
          ],
          hand: [{ card: CARD_ID, as: "apocalymon" }, "BT1-013"],
          deck: FILLER_DECK,
          security: [{ card: "BT1-009", as: "faceDown" }, ...COLOR_GUARD],
        },
        1: { deck: FILLER_DECK, security: ["BT1-009", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;

    // Illegal source: BT2-064 HiAndromon is Lv.6 but has no [Dark Masters] trait.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongHost").permanentId,
        instanceId: s.inst("apocalymon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("wrongHost").topCard.cardId).toBe("BT2-064");
    expect(s.state.memory).toBe(5);

    const hostId = s.perm("host").permanentId;
    const deckBefore = s.state.players[0]!.deck.length;
    const handBefore = s.state.players[0]!.hand.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: s.inst("apocalymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 5);

    // Cost 5 paid through the alternate requirement, plus the digivolution bonus draw: the
    // card left the hand and one card came off the deck, so the hand size is unchanged.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.perm("host").topCard.cardId).toBe(CARD_ID);
    // Q5785: the single [Dark Masters] digivolution card was played back out, leaving the
    // Apocalymon with no digivolution cards.
    expect(s.perm("host").stack).toHaveLength(0);
    const played = s.state.players[0]!.battleArea.find(
      ({ permanentId, topCard }) => permanentId !== hostId && topCard.cardId === "EX10-012",
    )!;
    expect(played).toBeDefined();

    const seen = observe(s.engine);
    expect(seen.hasKeyword(played, "Rush")).toBe(true);
    expect(seen.hasKeyword(s.perm("resident"), "Rush")).toBe(true);
    expect(seen.hasKeyword(s.perm("plain"), "Rush")).toBe(false);
    expect(seen.hasKeyword(s.perm("host"), "Rush")).toBe(false);

    const playedId = played.permanentId;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // Only the Digimon this effect PLAYED is deleted; the pre-existing [Dark Masters] Digimon
    // and the plain Digimon survive.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual([
      "BT1-009",
      "BT2-064",
      "EX10-020",
      CARD_ID,
    ]);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === playedId)).toBe(false);
    // "for the turn": the grant is gone once the turn it was made in has ended.
    expect(observe(s.engine).hasKeyword(s.perm("resident"), "Rush")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("EX10-061 Apocalymon — end-of-turn processing", () => {
  // Q5741/Q5742: the deletion this card arms is pending processing at end of turn, not an
  // immediate consequence. When another end-of-turn processing is pending at the same time —
  // here [Puppetmon]'s own "[Hand] [Main] ... At turn end, delete the Digimon this effect
  // played" — the two are simultaneous and the TURN PLAYER chooses the order. Both still
  // resolve, and this card is not one of them.
  it("Q5741/Q5742: its delete is simultaneous with another end-of-turn processing, ordered by the turn player", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-020", as: "puppet" }, { card: CARD_ID, as: "apocalymon" }, "BT1-013"],
          deck: FILLER_DECK,
          security: [
            { card: "EX10-012", as: "metal", faceUp: true },
            { card: "BT1-009", as: "faceDown" },
            ...COLOR_GUARD,
          ],
        },
        1: { deck: FILLER_DECK, security: ["BT1-009", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // 1. Puppetmon plays itself for 11 - 5 = 6 and arms its own turn-end delete.
    s.state.memory = 6;
    const puppetInstanceId = s.inst("puppet").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: puppetInstanceId,
        effectKey: reducedCostPlayEffectKey(s, s.inst("puppet"), "EX10-020"),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-020"));
    expect(s.state.memory).toBe(0);

    // 2. Apocalymon places the face-up [MetalSeadramon] (17 - 4 = 13) and plays it back out,
    //    arming its own turn-end delete on that Digimon.
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("apocalymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual([
      "EX10-012",
      "EX10-020",
      CARD_ID,
    ]);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // Both pending deletions resolved; only the Apocalymon that armed them is left.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX10-012", "EX10-020"]),
    );

    // Q5742: the turn player is asked for the order of the simultaneous end-of-turn processing.
    const orderPrompts = s.decisions.filter(({ req }) => req.kind === "orderTriggers");
    expect(orderPrompts.length).toBeGreaterThan(0);
    expect(orderPrompts.every(({ seat }) => seat === 0)).toBe(true);
    expect(orderPrompts.some(({ req }) => (req.options?.triggerKeys ?? []).length > 1)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
