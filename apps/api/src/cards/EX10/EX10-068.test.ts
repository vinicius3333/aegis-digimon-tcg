import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-068.js";
import "../index.js";

const CARD_ID = "EX10-068";

/**
 * EX10-068 Digimon Emperor (Tamer, White, play cost 5).
 *
 * [Start of Your Main Phase] For every 2 colors your opponent's Digimon and Tamers have,
 *   gain 1 memory.
 * [On Play] Delete 1 of your opponent's play cost 5 or lower Digimon. Then, by returning 1
 *   Digimon card from your opponent's trash to the bottom of the deck, from your hand or
 *   trash and without paying the cost, you may play 1 level 4 or lower Digimon card with the
 *   same color as the card this effect returned.
 * [Security] Play this card without paying the cost.
 *
 * Every behavioural case below runs through public intents: `playCard` for the entry
 * window, `attack` for the security check, and the real turn loop for the start-of-main
 * trigger. Injected timing is not used anywhere in this file.
 *
 * Fixtures are inert (no printed or inherited text) so nothing but this card can open a
 * decision or move a card: BT1-009 (Red Lv.3), BT1-027 (Blue Lv.3), BT1-038 (Blue Lv.5),
 * BT1-065 (Green Lv.3), BT1-013/BT1-014 (Red), BT10-022 (Blue/Black Lv.5, cost 6),
 * BT10-055 (Green/Yellow Lv.6, cost 10), BT8-041 (Yellow/Purple Lv.5, cost 7).
 * BT16-021 (Blue/Green Lv.4) is inert while it sits in a trash or a deck, which is the
 * only place this file puts it.
 */
describe("EX10-068 Digimon Emperor", () => {
  it("records the exact catalog and all three printed clauses", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Digimon Emperor",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 5,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["-"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    const definition = getCardDefinition(CARD_ID)!;
    expect(definition.effectText).toContain("[Start of Your Main Phase] For every 2 colors");
    expect(definition.effectText).toContain("[On Play] Delete 1 of your opponent's play cost 5 or lower Digimon.");
    expect(definition.effectText).toContain("with the same color as the card this effect returned");
    expect(definition.inheritedEffectText ?? "").toBe("");

    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find(({ trigger }) => trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          scaling: { per: 2, unit: "colors", filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
        },
      ],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 5 }, count: 1 },
        },
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          target: {
            count: 1,
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              sameColorAsReturned: true,
            },
          },
          cost: {
            kind: "return",
            to: "deckBottom",
            target: { filter: { zone: "trash", controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
        },
      ],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true, filter: { isSelfRef: true } } }],
    });
  });

  // -------------------------------------------------------------------------
  // [Start of Your Main Phase] — through the real turn loop
  // -------------------------------------------------------------------------

  /**
   * Seat 0 owns the Emperor; the opponent's board is the variable under test. The control
   * board is identical except that it holds only single-Red opposing Digimon (1 colour,
   * `floor(1/2) = 0` memory), so the difference between the two runs is exactly the
   * scaled gain and no turn-start bookkeeping is baked into the expected number.
   */
  async function memoryAtOwnMainPhase(opponentBattleArea: string[], ownExtra: string[] = []): Promise<number> {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "emperor" }, ...ownExtra],
        hand: ["BT1-009"],
        deck: ["BT1-013", "BT1-014"],
        security: ["BT1-013", "BT1-014"],
      },
      1: {
        battleArea: opponentBattleArea,
        hand: ["BT1-009"],
        deck: ["BT1-013", "BT1-014"],
        security: ["BT1-013", "BT1-014"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const memory = s.state.memory;
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    return memory;
  }

  it("gains no memory when the opponent's board shows a single colour", async () => {
    const oneColour = await memoryAtOwnMainPhase(["BT1-009", "BT1-013"]);
    const noBoard = await memoryAtOwnMainPhase([]);
    expect(oneColour).toBe(noBoard);
  });

  it("gains 1 memory for 3 opposing colours and 2 for 5, counting Tamers as well as Digimon", async () => {
    const baseline = await memoryAtOwnMainPhase(["BT1-009"]);
    // BT10-022 is Blue/Black and the opposing EX10-068 is a White TAMER: 3 distinct colours.
    const threeColours = await memoryAtOwnMainPhase(["BT10-022", CARD_ID]);
    // Adding Green/Yellow BT10-055 takes the board to 5 distinct colours.
    const fiveColours = await memoryAtOwnMainPhase(["BT10-022", CARD_ID, "BT10-055"]);

    expect(threeColours - baseline).toBe(1);
    expect(fiveColours - baseline).toBe(2);
  });

  it("counts only the OPPONENT's board: my own multi-coloured Digimon add nothing", async () => {
    const baseline = await memoryAtOwnMainPhase(["BT1-009"]);
    // Yellow/Purple and Green/Yellow on MY side would push the count to 5 colours if the
    // filter's `controller: "opponent"` were dropped.
    const withOwnColours = await memoryAtOwnMainPhase(["BT1-009"], ["BT8-041", "BT10-055"]);
    expect(withOwnColours).toBe(baseline);
  });

  it("is inert in the trash and in the hand: neither copy adds memory at the start of the main phase", async () => {
    const withCopiesAside = async (): Promise<number> => {
      const s = setupEngine({
        0: {
          trash: [CARD_ID],
          hand: [CARD_ID, "BT1-009"],
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: ["BT10-022", "BT10-055"],
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-013", "BT1-014"],
        },
      });
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      const memory = s.state.memory;
      // Nothing was played and nothing was deleted: the trashed and held copies did nothing.
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([CARD_ID, "BT1-009"]);
      expect(s.state.players[1]!.battleArea).toHaveLength(2);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
      return memory;
    };
    const inert = await withCopiesAside();
    // The same 4-colour opposing board WITH the Emperor in play gains 2 memory.
    const baseline = await memoryAtOwnMainPhase(["BT1-009"]);
    const inPlay = await memoryAtOwnMainPhase(["BT10-022", "BT10-055"]);
    expect(inPlay - baseline).toBe(2);
    expect(inert).toBe(baseline);
  });

  // -------------------------------------------------------------------------
  // [On Play] — through the public `playCard` intent
  // -------------------------------------------------------------------------

  it("[On Play] deletes exactly 1 opposing play-cost-5-or-lower Digimon and pays the printed 5 memory", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "emperor" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cheap" },
            { card: "BT10-022", as: "expensive" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const cheapInstanceId = s.perm("cheap").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emperor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    // Play cost 6 survives the "play cost 5 or lower" filter; the cost-2 Digimon is deleted.
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT10-022"]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([cheapInstanceId]);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("[On Play] deletes nothing when every opposing Digimon costs more than 5", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "emperor" }] },
        1: { battleArea: [{ card: "BT10-022", as: "expensive" }, "BT10-055"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emperor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle(() => false, 30);

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  /**
   * Q5181 / Q5182: the returned card is a Blue/Green two-colour Digimon, so the follow-up
   * play accepts a Lv.4-or-lower Digimon that has EITHER Blue or Green among its colours.
   */
  it.each([
    ["Blue", "BT1-027"],
    ["Green", "BT1-065"],
  ])(
    "Q5181/Q5182 returns a Blue/Green card to the deck bottom and plays a level-4-or-lower %s Digimon free",
    async (_colour, playable) => {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: CARD_ID, as: "emperor" },
              { card: playable, as: "payload" },
            ],
          },
          1: { trash: [{ card: "BT16-021", as: "dualColour" }], deck: ["BT1-013", "BT1-014"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      const returnedInstanceId = s.inst("dualColour").instanceId;
      const payloadInstanceId = s.inst("payload").instanceId;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emperor").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.length === 2);
      await settle(() => false, 30);

      // Cost paid: the opponent's trash card is now the bottom card of the OPPONENT's deck.
      expect(s.state.players[1]!.trash).toHaveLength(0);
      expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014", "BT16-021"]);
      expect(s.state.players[1]!.deck.at(-1)!.instanceId).toBe(returnedInstanceId);
      // Payload played from hand for free: the 5 memory paid was the Tamer's own play cost.
      expect(s.state.players[0]!.hand).toHaveLength(0);
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(
        [CARD_ID, playable].sort(),
      );
      expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === payloadInstanceId)).toBe(true);
      expect(s.state.memory).toBe(0);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("plays the same-colour payload out of my TRASH as well as my hand", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "emperor" }], trash: [{ card: "BT1-027", as: "payload" }] },
        1: { trash: [{ card: "BT16-021", as: "dualColour" }], deck: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const payloadInstanceId = s.inst("payload").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emperor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => false, 30);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === payloadInstanceId)).toBe(true);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT16-021"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5182 negative: a Red payload shares no colour with the Blue/Green card, so the return is never paid", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "emperor" },
            { card: "BT1-009", as: "redPayload" },
          ],
        },
        1: { trash: [{ card: "BT16-021", as: "dualColour" }], deck: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emperor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle(() => false, 30);

    // The whole clause is transactional: with no legal payload the cost stays unpaid.
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT16-021"]);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("level boundary: a Blue LEVEL 5 payload is not playable even though the colour matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "emperor" },
            { card: "BT1-038", as: "blueLevel5" },
          ],
        },
        1: { trash: [{ card: "BT16-021", as: "dualColour" }], deck: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emperor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle(() => false, 30);

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT16-021"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-038"]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it('optional "you may": declining leaves the return unpaid but keeps the mandatory deletion', async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "emperor" },
            { card: "BT1-027", as: "payload" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "cheap" }],
          trash: [{ card: "BT16-021", as: "dualColour" }],
          deck: ["BT1-013"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emperor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => false, 30);

    // "Delete 1 ..." is mandatory; only the "Then, ... you may play" half was declined.
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT16-021"]);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-027"]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // [Security] — through a real security check
  // -------------------------------------------------------------------------

  it("[Security] plays itself into the battle area free during a real security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-022", as: "attacker" }] },
        1: { security: [{ card: CARD_ID, as: "emperor" }], deck: ["BT1-013"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const emperorInstanceId = s.inst("emperor").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => false, 30);

    expect(s.state.players[1]!.security).toHaveLength(0);
    const played = s.state.players[1]!.battleArea[0]!;
    expect(played.topCard!.cardId).toBe(CARD_ID);
    expect(played.topCard!.instanceId).toBe(emperorInstanceId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    // Played without paying: the attacker costs 6, so the [On Play] deletion finds no target
    // and the memory dial only reflects the attack itself, never the Tamer's 5 cost.
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
