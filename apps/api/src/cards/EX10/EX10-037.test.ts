import { getCardDefinition, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-037.js";
import "../index.js";

const CARD_ID = "EX10-037";

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
    expect(p0.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("milledImpmon").instanceId,
      s.inst("milledInert").instanceId,
    ]);
    expect(p0.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-009"]);
    expect(p0.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lv5Id]);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not ask to delete when a milled Impmon has no eligible opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          deck: [
            { card: CARD_ID, as: "milledImpmon" },
            { card: "BT1-009", as: "milledInert" },
          ],
        },
        1: { battleArea: [{ card: "BT1-020", as: "lv5" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() =>
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("milledImpmon").instanceId),
    );

    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([s.perm("lv5").permanentId]);
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

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: impmonPermanentId,
        instanceId: s.inst("meramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("impmon").topCard?.cardId === "BT3-083");

    const carrier = s.perm("impmon");
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([impmonInstanceId]);
    expect(carrier.permanentId).toBe(impmonPermanentId);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("spare").instanceId,
      s.inst("drawn").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-009"]);

    expect(carrier.currentDP).toBe(getCardDefinition("BT3-083")!.dp! + 2000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("an opponent's effect that mills my deck also fires the deck-trash clause", async () => {
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

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("milledImpmon").instanceId,
      s.inst("milledInert").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[0]!.security).toHaveLength(2);
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

    expect(s.perm("host").currentDP).toBe(base + 1000);
    s.give(0, Zone.Trash, "BT1-009");
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(base + 2000);

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
