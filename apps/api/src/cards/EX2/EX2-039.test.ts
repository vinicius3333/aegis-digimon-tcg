import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-039.js";
import "./EX2-006.js";
import "./EX2-039.js";
import "./EX2-040.js";
import "./EX2-042.js";
import "./EX2-043.js";
import "./EX2-044.js";
import "./EX2-065.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-009"];

describe("EX2-039 Impmon", () => {
  it("matches the catalog, Q&A, and compiled direct-trash/reveal/inherited clauses", () => {
    expect(getCardDefinition("EX2-039")).toMatchObject({
      cardId: "EX2-039",
      nameEn: "Impmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Evil"],
      effectText:
        "When this card is trashed from your deck, if it wasn't trashed by [EX2-039 Impmon]'s effect, you may trash up to 3 cards from the top of your deck.[On Play] Reveal the top 4 cards of your deck. Add 1 Digimon card with [Beelzemon] in its name and 1 [Ai & Mako] among them to your hand. Place the remaining cards at the bottom of your deck in any order.",
      inheritedEffectText: "[Your Turn] While this Digimon has [Beelzemon] in its name, it gets +3000 DP.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenTrashedFromDeck",
              sourceFilter: { isSelfRef: true },
              excludeSelfEffect: true,
              actions: [
                {
                  kind: "TrashTopDeck",
                  controller: "mine",
                  amount: 3,
                  upTo: true,
                  minimum: 1,
                  optional: true,
                  abortOnDecline: true,
                },
              ],
            },
          ],
        },
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 4,
              rest: "deckBottom",
              add: [
                {
                  count: 1,
                  to: "hand",
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Beelzemon"], match: "name" }],
                  },
                },
                {
                  count: 1,
                  to: "hand",
                  filter: {
                    controllerDefault: "mine",
                    nameOrTrait: [{ tokens: ["Ai & Mako"], match: "name" }],
                  },
                },
              ],
            },
          ],
        },
        {
          trigger: "YourTurn",
          isInherited: true,
          actions: [
            {
              kind: "Aura",
              while: { kind: "selfHasNameContaining", names: ["Beelzemon"] },
              effect: { kind: "modifyDP", amount: 3000 },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("plays for its paid cost, adds matching cards from the top four, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-039", as: "impmon" }],
          deck: [
            { card: "EX2-044", as: "beelzemon" },
            { card: "EX2-065", as: "aiMako" },
            { card: "BT1-009", as: "bottomOne" },
            { card: "BT1-013", as: "bottomTwo" },
            { card: "BT1-009", as: "tailOne" },
            { card: "BT1-013", as: "tailTwo" },
          ],
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("impmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 4);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("beelzemon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("aiMako").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("tailOne").instanceId,
      s.inst("tailTwo").instanceId,
      s.inst("bottomOne").instanceId,
      s.inst("bottomTwo").instanceId,
    ]);
  });

  it("trashes exactly one additional card when the direct-trash effect is activated (Q3334)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-043", as: "miller", under: ["EX2-040"] }],
          deck: [
            { card: "EX2-039", as: "milledImpmon" },
            { card: "BT1-009", as: "firstMilled" },
            { card: "BT1-013", as: "secondMilled" },
            { card: "BT1-009", as: "tail" },
          ],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("miller").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const millDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: millDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const impmonDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: impmonDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const amountDecision = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req.options?.choices).toEqual(["Trash 1 card", "Trash 2 cards", "Trash 3 cards"]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: amountDecision.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("milledImpmon").instanceId,
      s.inst("firstMilled").instanceId,
      s.inst("secondMilled").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("tail").instanceId]);
  });

  it("does not recursively trigger an Impmon trashed by its own mill", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-043", as: "miller", under: ["EX2-040"] }],
          deck: [
            { card: "EX2-039", as: "firstImpmon" },
            { card: "BT1-009", as: "firstFiller" },
            { card: "EX2-039", as: "secondImpmon" },
            { card: "BT1-013", as: "secondFiller" },
            { card: "BT1-009", as: "sentinel" },
          ],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        autoOrderTriggers: true,
        preferOptionIndex: 2,
      },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("miller").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("firstImpmon").instanceId,
      s.inst("firstFiller").instanceId,
      s.inst("secondImpmon").instanceId,
      s.inst("secondFiller").instanceId,
      s.inst("sentinel").instanceId,
    ]);
  });

  it("does not trigger direct-trash behavior when Impmon is only revealed (Q3333)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-039", as: "playedImpmon" }],
          deck: [
            { card: "EX2-039", as: "revealedImpmon" },
            { card: "EX2-044", as: "beelzemon" },
            { card: "EX2-065", as: "aiMako" },
            { card: "BT1-009", as: "filler" },
            ...inertDeck,
          ],
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedImpmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 8);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("revealedImpmon").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("revealedImpmon").instanceId);
  });

  it("keeps the inherited +3000 DP through a Beelzemon evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-044", as: "beelzemon", under: ["EX2-039", "EX2-040", "EX2-042"] }],
        security: inertSecurity,
        deck: inertDeck,
      },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("beelzemon").currentDP).toBe(14000);
  });

  it("supports the legal purple egg evolution and rejects a non-purple source", async () => {
    const legal = setupEngine({
      0: {
        eggDeck: [{ card: "EX2-006", as: "egg" }],
        hand: [{ card: "EX2-039", as: "impmon" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    legal.state.memory = 10;
    await legal.ready();
    const loop = legal.engine.startTurnLoop();
    await settle(() => legal.state.phase === Phase.Breeding && legal.state.turnSeat === 0);
    expect(legal.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => legal.state.players[0]!.breeding?.topCard?.cardId === "EX2-006");
    const egg = legal.state.players[0]!.breeding!;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: egg.permanentId,
        instanceId: legal.inst("impmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => egg.topCard?.cardId === "EX2-039");
    expect(legal.state.memory).toBe(10);
    expect(egg.stack.map((card) => card.cardId)).toEqual(["EX2-006"]);
    advance(legal.engine).endMainPhaseIfOpen(0);
    await advance(legal.engine).waitForMainPhase(1);
    advance(legal.engine).endMainPhaseIfOpen(1);
    await settle(() => legal.state.phase === Phase.Breeding && legal.state.turnSeat === 0);
    expect(legal.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: egg.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => legal.state.players[0]!.breeding === undefined);
    await advance(legal.engine).waitForMainPhase(0);
    expect(legal.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "EX2-014", as: "wrongSource" }],
        hand: [{ card: "EX2-039", as: "impmon" }],
        deck: inertDeck,
        security: inertSecurity,
      },
    });
    illegal.state.memory = 5;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("wrongSource").permanentId,
        instanceId: illegal.inst("impmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
