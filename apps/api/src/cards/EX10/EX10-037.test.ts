import { getCardDefinition, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-037.js";
import "../index.js";

const CARD_ID = "EX10-037";

/**
 * EX10-037 Impmon (Purple, Lv.3 Rookie, [Evil]).
 *
 * Main text:
 *   1. "When this card is trashed from the top of the deck, you may delete 1 of your
 *      opponent's level 4 or lower Digimon."
 *   2. "[Start of Your Main Phase] Trash the top 2 cards of your deck."
 * Inherited:
 *   3. "[Your Turn] For every 10 cards in your trash, this Digimon gets +1000 DP."
 *
 * Clause 2 is the public route into clause 1: the real turn loop opens Main, the resident
 * Impmon mills two cards, and a second Impmon among them fires its own deck-trash watcher.
 * No injected timing is used for any behavioural claim below.
 */
describe("EX10-037 Impmon", () => {
  it("records the exact catalog and printed text", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Impmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 4,
      dp: 2000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Evil"],
      inheritedEffectText: "[Your Turn] For every 10 cards in your trash, this Digimon gets +1000 DP.",
    });
    const definition = getCardDefinition(CARD_ID)!;
    expect(definition.effectText).toContain(
      "When this card is trashed from the top of the deck, you may delete 1 of your opponent's level 4 or lower Digimon.",
    );
    expect(definition.effectText).toContain("[Start of Your Main Phase] Trash the top 2 cards of your deck.");
    expect(definition.securityEffectText ?? "").toBe("");
  });

  it("compiles the three clauses with no residual", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromDeck",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Delete",
              optional: true,
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
                count: 1,
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [{ kind: "TrashTopDeck", controller: "mine", amount: 2 }],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
          scaling: { per: 10, unit: "trash", filter: { zone: "trash", controller: "mine" } },
        },
      ],
    });
  });

  it("[Start of Your Main Phase] mills 2 and the milled Impmon deletes an opponent Lv.4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source", dp: 20_000 }],
          // The opening turn of the loop has no draw phase, so the top two cards are milled.
          deck: [{ card: CARD_ID, as: "milledImpmon" }, { card: "BT1-009", as: "milledInert" }, "BT1-009", "BT1-009"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "lv4" },
            { card: "BT1-020", as: "lv5" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lv4Id = s.perm("lv4").permanentId;
    const lv5Id = s.perm("lv5").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === lv4Id));

    const p0 = s.state.players[0]!;
    // Both milled cards reached the trash; only the Impmon among them fired.
    expect(p0.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("milledImpmon").instanceId,
      s.inst("milledInert").instanceId,
    ]);
    expect(p0.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-009"]);
    // The opening turn skips the draw phase: the hand is untouched.
    expect(p0.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    // The level-4 ceiling: the Lv.5 was never a legal candidate and survives.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lv5Id]);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining the optional delete leaves the opponent's Lv.4 alive, mill still happens", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source", dp: 20_000 }],
          deck: [{ card: CARD_ID, as: "milledImpmon" }, { card: "BT1-009", as: "milledInert" }, "BT1-009"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "lv4" }],
          deck: ["BT1-009", "BT1-009"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoDeclineOptional: true },
    );
    const lv4Id = s.perm("lv4").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.trash.length === 2);
    await settle(() => false, 30);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("milledImpmon").instanceId,
      s.inst("milledInert").instanceId,
    ]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lv4Id]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("no legal target: with only a Lv.5 in play the milled Impmon deletes nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source", dp: 20_000 }],
          deck: [{ card: CARD_ID, as: "milledImpmon" }, { card: "BT1-009", as: "milledInert" }, "BT1-009"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "lv5" }],
          deck: ["BT1-009", "BT1-009"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lv5Id = s.perm("lv5").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.trash.length === 2);
    await settle(() => false, 30);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lv5Id]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5116: revealing this card from the deck is not a deck trash, so nothing is deleted", async () => {
    // BT11-046 [On Play]: "Reveal the top 4 cards of your deck. Add 1 Tamer card among them to
    // your hand. Place the rest at the bottom of your deck in any order." The deck holds no
    // Tamer, so every revealed card — Impmon included — goes back to the bottom untouched.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-046", as: "revealer" }],
          deck: [{ card: CARD_ID, as: "revealedImpmon" }, "BT1-009", "BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-014", as: "lv4" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lv4Id = s.perm("lv4").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("revealer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle(() => false, 30);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lv4Id]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("revealedImpmon").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("public digivolution route: a purple Lv.4 digivolves onto Impmon, paying 1 and drawing 1", async () => {
    // BT3-083 Meramon is a purple Lv.4 with no effect text and no inherited text, so every
    // endpoint below belongs to the route or to Impmon's inherited clause.
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "impmon" },
          { card: "BT1-009", as: "redLv3" },
        ],
        hand: [
          { card: "BT3-083", as: "meramon" },
          { card: "BT1-013", as: "spare" },
        ],
        deck: [{ card: "BT1-014", as: "drawn" }, "BT1-009", "BT1-009"],
        trash: Array.from({ length: 20 }, () => "BT1-009"),
        security: ["BT1-009", "BT1-013"],
      },
      1: { deck: ["BT1-009", "BT1-009"], hand: ["BT1-013"], security: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 3;
    await s.ready();
    const impmonInstanceId = s.inst("impmon").instanceId;
    const impmonPermanentId = s.perm("impmon").permanentId;

    // Illegal source: BT1-009 is a RED Lv.3, and Meramon's only evolution cost is purple Lv.3.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redLv3").permanentId,
        instanceId: s.inst("meramon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("redLv3").topCard!.cardId).toBe("BT1-009");
    expect(s.perm("redLv3").stack).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT3-083", "BT1-013"]);

    // Legal source: Impmon is purple Lv.3, so the printed cost of 1 applies.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: impmonPermanentId,
        instanceId: s.inst("meramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("impmon").topCard?.cardId === "BT3-083");

    const carrier = s.perm("impmon");
    // Stack identity: the exact Impmon instance is now the digivolution card beneath Meramon.
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([impmonInstanceId]);
    expect(carrier.permanentId).toBe(impmonPermanentId);
    // Cost: 3 - 1. Bonus draw: the named top deck card is now in hand.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("spare").instanceId,
      s.inst("drawn").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-009"]);

    // The inherited clause now runs on a carrier built by a public route: 20 trash -> +2000.
    expect(carrier.currentDP).toBe(getCardDefinition("BT3-083")!.dp! + 2000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("an opponent's effect that mills my deck also fires the deck-trash clause", async () => {
    // BT14-077 SkullSatamon [On Play]: "Trash the top 2 cards of both players' decks." The
    // printed clause carries no attribution, so my milled Impmon fires on the opponent's mill.
    const s = setupEngine(
      {
        0: {
          deck: [{ card: CARD_ID, as: "milledImpmon" }, { card: "BT1-009", as: "milledInert" }, "BT1-009"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "lv4" }],
          hand: [{ card: "BT14-077", as: "skull" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const lv4Id = s.perm("lv4").permanentId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("skull").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === lv4Id));
    await settle(() => false, 30);

    // My deck was milled by THEIR effect, and the milled Impmon deleted their Lv.4.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("milledImpmon").instanceId,
      s.inst("milledInert").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[0]!.security).toHaveLength(2);
    // Their own deck lost its top 2 as well, and the deleted Lv.4 followed them into the trash.
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-009", "BT1-014"]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard!.cardId)).toEqual(["BT14-077"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherited [Your Turn]: +1000 per complete group of 10 trash cards, gone on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "impmon" }] }],
        trash: Array.from({ length: 19 }, () => "BT1-009"),
        deck: ["BT1-009", "BT1-009", "BT1-009"],
        hand: ["BT1-013"],
        security: ["BT1-009", "BT1-013"],
      },
      1: {
        deck: ["BT1-009", "BT1-009", "BT1-009"],
        hand: ["BT1-013"],
        security: ["BT1-009", "BT1-013"],
      },
    });
    await s.ready();
    const base = getCardDefinition("BT1-014")!.dp!;
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual([CARD_ID]);

    // 19 cards is one complete group of ten: +1000, not +1900.
    expect(s.perm("host").currentDP).toBe(base + 1000);
    s.give(0, Zone.Trash, "BT1-009");
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(base + 2000);

    // The buff is turn-scoped: it is gone once the opponent's turn is authoritatively open.
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(base + 2000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(base);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
