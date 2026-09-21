import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX13-018.js";

type NameOrTraitReference = Parameters<typeof matchNameOrTrait>[1];

const CARD_ID = "EX13-018";
const DRACOMON_BASE = "ST1-04";
const NON_DRACOMON_BASE = "BT1-013";
const WRONG_LEVEL_BASE = "BT1-014";
const TEXT_MATCH = "BT20-040";
const NAME_MATCH = "BT20-045";
const NON_MATCH = "BT1-009";
const EXAMON_DEST = "BT20-025";
const PLAIN_DEST = "BT1-020";
const FILLER = "BT1-009";
const DECK = [FILLER, FILLER, FILLER, FILLER, FILLER, FILLER];

describe("EX13-018 Coredramon", () => {
  it("matches every catalog field and the complete compiled clause set", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      set: "EX13",
      nameEn: "Coredramon",
      colors: ["Blue", "Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Dragon"],
      rarity: "C",
      maxCountInDeck: 4,
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Red", level: 3, memoryCost: 3 },
      ],
    });
    expect(getCardDefinition(CARD_ID)?.effectText).toBe(
      "[Digivolve] Lv.3 w/[Dracomon] in name: Cost 2 \n\n[On Play] [When Digivolving] By trashing 1 card with [Dracomon] or [Examon] in its text from your hand, ＜Draw 2＞ \n[Your Turn] When any of your other Digimon with [Dracomon] or [Examon] in their texts are played, this Digimon may digivolve into a Digimon card with [Examon] in its text in the hand with the cost reduced by 2.",
    );
    expect(getCardDefinition(CARD_ID)?.inheritedEffectText).toBe("[Your Turn] This Digimon gets +2000 DP.");
    expect(getCardDefinition(CARD_ID)?.securityEffectText).toBeUndefined();

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(4);

    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, names: ["Dracomon"], cost: 2, isAlternate: true }]);

    const drawCost = {
      kind: "trash",
      target: {
        filter: {
          zone: "hand",
          controller: "mine",
          nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
        },
        count: 1,
      },
    };
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        trigger,
        actions: [
          { kind: "Draw", controller: "mine", amount: 2, optional: true, abortOnDecline: true, cost: drawCost },
        ],
      });
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.frequency).toBeUndefined();
    }

    const digivolveClause = compiled.effects.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited);
    expect(digivolveClause).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
          },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Examon"], match: "text" }],
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 2,
              optional: true,
            },
          ],
        },
      ],
    });
    expect(digivolveClause?.frequency).toBeUndefined();
    expect(digivolveClause?.isInherited).toBeUndefined();

    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "permanent",
        },
      ],
    });
  });

  it("Q7257/Q7258 treats either [Dracomon] or [Examon] in the full printed text as a match", () => {
    const reference: NameOrTraitReference = { tokens: ["Dracomon", "Examon"], match: "text" };
    const nameOnly: NameOrTraitReference = { tokens: ["Dracomon", "Examon"], match: "name" };
    const textMatch = getCardDefinition(TEXT_MATCH)!;
    const nameMatch = getCardDefinition(NAME_MATCH)!;
    const nonMatch = getCardDefinition(NON_MATCH)!;

    expect(matchNameOrTrait(textMatch, reference)).toBe(true);
    expect(matchNameOrTrait(textMatch, nameOnly)).toBe(false);
    expect(matchNameOrTrait(nameMatch, reference)).toBe(true);
    expect(matchNameOrTrait(nameMatch, nameOnly)).toBe(true);
    expect(matchNameOrTrait(nonMatch, reference)).toBe(false);
    expect(matchNameOrTrait(nonMatch, nameOnly)).toBe(false);

    const examonOnly: NameOrTraitReference = { tokens: ["Examon"], match: "text" };
    expect(matchNameOrTrait(getCardDefinition(EXAMON_DEST)!, examonOnly)).toBe(true);
    expect(matchNameOrTrait(getCardDefinition(PLAIN_DEST)!, examonOnly)).toBe(false);
  });

  it("trashes a [Dracomon]-text hand card on play and draws exactly 2", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "coredramon" },
            { card: TEXT_MATCH, as: "bait" },
            { card: NON_MATCH, as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: [FILLER, FILLER, FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();
    const baitInstanceId = s.inst("bait").instanceId;
    const spareInstanceId = s.inst("spare").instanceId;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coredramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 3);

    const me = s.state.players[0]!;
    expect(me.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([CARD_ID]);
    expect(me.trash.map((card) => card.instanceId)).toEqual([baitInstanceId]);
    expect(me.deck).toHaveLength(deckBefore - 2);
    expect(me.hand).toHaveLength(3);
    expect(me.hand.some((card) => card.instanceId === spareInstanceId)).toBe(true);
    expect(me.hand.some((card) => card.instanceId === baitInstanceId)).toBe(false);
    expect(s.state.memory).toBe(8 - 5);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("draws nothing on play when no hand card carries either token", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "coredramon" },
            { card: NON_MATCH, as: "spare" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: [FILLER, FILLER, FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();
    const deckBefore = s.state.players[0]!.deck.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coredramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    await settle(() => false, 50);

    const me = s.state.players[0]!;
    expect(me.trash).toHaveLength(0);
    expect(me.deck).toHaveLength(deckBefore);
    expect(me.hand.map((card) => card.cardId)).toEqual([NON_MATCH]);
    expect(s.state.memory).toBe(8 - 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the trash cost cancels the draw instead of drawing for free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "coredramon" },
            { card: TEXT_MATCH, as: "bait" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: [FILLER, FILLER, FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const deckBefore = s.state.players[0]!.deck.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coredramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    await settle(() => false, 50);

    const me = s.state.players[0]!;
    expect(me.trash).toHaveLength(0);
    expect(me.deck).toHaveLength(deckBefore);
    expect(me.hand.map((card) => card.cardId)).toEqual([TEXT_MATCH]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves off a Lv.3 Dracomon for the alternate 2 and draws 2 on top of the bonus draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: DRACOMON_BASE, as: "base" }],
          hand: [
            { card: CARD_ID, as: "coredramon" },
            { card: TEXT_MATCH, as: "bait" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: [FILLER, FILLER, FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard.instanceId;
    const baitInstanceId = s.inst("bait").instanceId;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("coredramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 3);

    const me = s.state.players[0]!;
    expect(s.perm("base").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.state.memory).toBe(5 - 2);
    expect(me.trash.map((card) => card.instanceId)).toEqual([baitInstanceId]);
    expect(me.deck).toHaveLength(deckBefore - 3);
    expect(me.hand).toHaveLength(3);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("charges the printed Red Lv.3 EvoCost of 3 without the alternate flag", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: DRACOMON_BASE, as: "base" }],
          hand: [{ card: CARD_ID, as: "coredramon" }],
          deck: DECK,
        },
        1: { deck: DECK, security: [FILLER, FILLER, FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("coredramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(5 - 3);
  });

  it("refuses the alternate route off a Lv.3 without [Dracomon] in its name, and any route off a Lv.4", async () => {
    const nonDracomon = setupEngine({
      0: {
        battleArea: [{ card: NON_DRACOMON_BASE, as: "base" }],
        hand: [{ card: CARD_ID, as: "coredramon" }],
        deck: DECK,
      },
      1: { deck: DECK },
    });
    nonDracomon.state.memory = 5;
    await nonDracomon.ready();
    expect(
      nonDracomon.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nonDracomon.perm("base").permanentId,
        instanceId: nonDracomon.inst("coredramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => nonDracomon.perm("base").topCard.cardId === CARD_ID);
    expect(nonDracomon.state.memory).toBe(5 - 3);

    const wrongLevel = setupEngine({
      0: {
        battleArea: [{ card: WRONG_LEVEL_BASE, as: "base" }],
        hand: [{ card: CARD_ID, as: "coredramon" }],
        deck: DECK,
      },
      1: { deck: DECK },
    });
    wrongLevel.state.memory = 10;
    await wrongLevel.ready();
    for (const useAlternateCost of [true, false]) {
      expect(
        wrongLevel.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: wrongLevel.perm("base").permanentId,
          instanceId: wrongLevel.inst("coredramon").instanceId,
          useAlternateCost,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
    }
    expect(wrongLevel.perm("base").topCard.cardId).toBe(WRONG_LEVEL_BASE);
  });

  it("digivolves into an [Examon]-text hand card for 2 less when another matching Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "host" }],
          hand: [
            { card: TEXT_MATCH, as: "trigger" },
            { card: EXAMON_DEST, as: "wingdramon" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: [FILLER, FILLER, FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 10;
    await s.ready();
    const hostInstanceId = s.perm("host").topCard.instanceId;
    const wingdramonInstanceId = s.inst("wingdramon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === EXAMON_DEST);

    expect(s.perm("host").topCard.instanceId).toBe(wingdramonInstanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([hostInstanceId]);
    expect(s.perm("host").stack[0]?.cardId).toBe(CARD_ID);
    expect(s.state.memory).toBe(10 - 5 - 2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === wingdramonInstanceId)).toBe(false);
    expect(s.perm("host").currentDP).toBe(7000 + 2000);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("Q7256 resolves the newly derived [When Digivolving] before the played Digimon's pending [On Play]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "host" }],
          hand: [
            { card: "EX13-008", as: "playedDracomon" },
            { card: EXAMON_DEST, as: "wingdramon" },
          ],
          deck: ["BT20-040", "BT20-045", FILLER, FILLER],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget", dp: 3000 },
            { card: "BT1-010", as: "secondTarget", dp: 4000 },
          ],
          deck: DECK,
          security: [FILLER, FILLER, FILLER],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferTriggerKeys: [CARD_ID],
      },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedDracomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === EXAMON_DEST);
    await settle(() => s.state.pendingDecision === undefined);

    const derivedIndex = s.decisions.findIndex(
      ({ req }) => req.sourceCardId === EXAMON_DEST && req.kind === "chooseTargets",
    );
    const originalIndex = s.decisions.findIndex(
      ({ req }) => req.sourceCardId === "EX13-008" && req.kind === "selectCards",
    );
    expect(derivedIndex).toBeGreaterThanOrEqual(0);
    expect(originalIndex).toBeGreaterThanOrEqual(0);
    expect(derivedIndex).toBeLessThan(originalIndex);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT20-040" || cardId === "BT20-045")).toBe(true);
  });

  it("leaves the host alone when the only hand Digimon has no [Examon] in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "host" }],
          hand: [
            { card: TEXT_MATCH, as: "trigger" },
            { card: PLAIN_DEST, as: "groundramon" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: [FILLER, FILLER, FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const groundramonInstanceId = s.inst("groundramon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 80);

    expect(s.perm("host").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === groundramonInstanceId)).toBe(true);
    expect(s.state.memory).toBe(10 - 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("is not armed by its own play, only by OTHER matching Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "sibling" }],
          hand: [
            { card: CARD_ID, as: "coredramon" },
            { card: TEXT_MATCH, as: "bait" },
            { card: EXAMON_DEST, as: "wingdramon" },
            { card: EXAMON_DEST, as: "siblingDest" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: [FILLER, FILLER, FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    s.state.memory = 10;
    await s.ready();
    const baitInstanceId = s.inst("bait").instanceId;
    const wingdramonInstanceId = s.inst("wingdramon").instanceId;
    preferInstanceIds.push(baitInstanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coredramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("sibling").topCard.cardId === EXAMON_DEST);
    await settle(() => false, 80);

    const me = s.state.players[0]!;
    expect(me.trash.map((card) => card.instanceId)).toEqual([baitInstanceId]);
    expect(s.perm("sibling").stack.map((card) => card.cardId)).toEqual([CARD_ID]);
    const playedPermanent = me.battleArea.find((permanent) => permanent.permanentId !== s.perm("sibling").permanentId);
    expect(playedPermanent?.topCard?.cardId).toBe(CARD_ID);
    expect(playedPermanent?.stack).toHaveLength(0);
    expect(me.hand.filter((card) => card.cardId === EXAMON_DEST)).toHaveLength(1);
    expect(s.state.memory).toBe(10 - 5 - 2);
    expect(wingdramonInstanceId).toBeDefined();
  });

  it("does not fire on the opponent's turn, nor for a matching Digimon the opponent plays", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "host" }],
          hand: [{ card: EXAMON_DEST, as: "wingdramon" }],
          deck: DECK,
        },
        1: { hand: [{ card: TEXT_MATCH, as: "opponentMatch" }], deck: DECK, security: [FILLER, FILLER, FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentMatch").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 80);

    expect(s.perm("host").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wingdramon").instanceId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stops offering the evolution once Coredramon is no longer the top card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "host" }],
          hand: [
            { card: TEXT_MATCH, as: "firstTrigger" },
            { card: TEXT_MATCH, as: "secondTrigger" },
            { card: EXAMON_DEST, as: "firstDest" },
            { card: EXAMON_DEST, as: "secondDest" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: [FILLER, FILLER, FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 10;
    await s.ready();
    const secondDestInstanceId = s.inst("secondDest").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTrigger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === EXAMON_DEST);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([CARD_ID]);
    const memoryAfterFirst = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTrigger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 80);

    expect(s.perm("host").topCard.cardId).toBe(EXAMON_DEST);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === secondDestInstanceId)).toBe(true);
    expect(s.state.memory).toBe(memoryAfterFirst - 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("grants its inherited +2000 DP only on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: EXAMON_DEST, dp: 7000, as: "host", under: [CARD_ID] }],
        deck: DECK,
      },
      1: { deck: DECK, security: [FILLER, FILLER, FILLER] },
    });
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(9000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
