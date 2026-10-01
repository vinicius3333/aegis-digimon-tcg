import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming, getCardDefinition, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { advance } from "../../engine/testkit/advance.js";
import "./LM-020.js";
import { setupEngine, settle, settleAcrossTimers, type BoardSpec } from "../../engine/testkit/harness.js";
import "../ST3/ST3-11.js";
import "../ST3/ST3-14.js";
import "../BT25/BT25-091.js";
import "../BT25/BT25-094.js";
import "../BT12/BT12-067.js";
import "../BT13/BT13-036.js";
import "../BT16/BT16-070.js";
import "../BT18/BT18-045.js";
import "../BT21/BT21-032.js";
import "../BT21/BT21-035.js";
import "../BT21/BT21-094.js";
import "../BT18/BT18-089.js";
import "../EX2/EX2-007.js";
import "../EX7/EX7-054.js";
import "./LM-023.js";

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "LM-020",
    set: "LM",
    nameEn: "Quantumon",
    kinds: ["Digimon"] as never,
    colors: ["Yellow", "Green"] as never,
    playCost: 13,
    dp: 13000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "INST#LM020",
    cardId: "LM-020",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => false,
    hasColor: () => false,
    ...over,
  };
}

describe("LM-020 Quantumon", () => {
  it("matches the committed Quantumon catalog contract", () => {
    const definition = getCardDefinition("LM-020");

    expect(definition).toMatchObject({
      cardId: "LM-020",
      nameEn: "Quantumon",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 5 },
        { color: "Green", level: 5, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Fairy"],
    });
  });

  it("registers complete security-exchange and category-immunity IR", () => {
    const compiled = runtimeCompiledCard("LM-020")!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          optional: true,
          source: { filter: { kind: ["Digimon"], allowTokens: true } },
        },
        { kind: "SecurityManipulation", op: "revealAllChooseToDeckTopShuffleRest", controller: "opponent" },
      ],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")?.frequency).toBeUndefined();
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfOpponentsTurn")?.actions).toEqual([
      expect.objectContaining({ kind: "DeclareCategoryImmunity", duration: "forTheTurn" }),
    ]);
  });

  it("publicly digivolves Quantumon and places an owned Digimon into security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-036", as: "base" },
            { card: "LM-016", as: "fodder" },
          ],
          hand: [{ card: "LM-020", as: "quantumon" }],
        },
        1: { security: ["BT1-009", "BT1-085"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quantumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.some((card) => card.cardId === "LM-020") &&
        s.state.players[1]!.security.length === 1 &&
        s.state.players[1]!.deck.length === 1,
    );
    expect(s.state.players[0]!.security.some((card) => card.cardId === "LM-020")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-020")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("still places the chosen Digimon when the opponent has no security cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-036", as: "base" }], hand: [{ card: "LM-020", as: "quantumon" }] },
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quantumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "LM-020"));
    expect(s.state.players[0]!.security.filter((card) => card.cardId === "LM-020")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
  it("places a chosen opposing Digimon into that opponent's own security stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-036", as: "base" }], hand: [{ card: "LM-020", as: "quantumon" }] },
        1: { battleArea: [{ card: "LM-016", as: "theirs" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("theirs").permanentId);
    s.state.memory = 10;

    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("quantumon").instanceId,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);

    expect(s.state.players[0]!.security.some((card) => card.cardId === "LM-016")).toBe(false);
    expect(
      s.state.players[1]!.security.some((card) => card.cardId === "LM-016") ||
        s.state.players[1]!.deck.some((card) => card.cardId === "LM-016"),
    ).toBe(true);
  });

  it("accepts a Digimon token as the security placement cost and removes it from play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-036", as: "base" }], hand: [{ card: "LM-020", as: "quantumon" }] },
        1: { battleArea: [{ card: "TOKEN-Diaboromon", as: "token" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("token").permanentId);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quantumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(
      s.state.players[1]!.security.some((card) => card.cardId === "TOKEN-Diaboromon") ||
        s.state.players[1]!.deck.some((card) => card.cardId === "TOKEN-Diaboromon"),
    ).toBe(false);
  });

  it("accepts Mother D-Reaper as the placement cost and applies the opponent security exchange", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-036", as: "base" },
            { card: "EX2-007", as: "mother" },
          ],
          hand: [{ card: "LM-020", as: "quantumon" }],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("mother").permanentId);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quantumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every((perm) => perm.topCard?.cardId !== "EX2-007"), 2000);

    expect(s.state.players[0]!.eggDeck.some((card) => card.cardId === "EX2-007")).toBe(true);
    expect(s.state.players[1]!.security.length).toBeLessThan(2);
    expect(s.state.players[1]!.deck.length).toBeGreaterThan(0);
  });

  const module = getEffectModule("LM-020");

  it("is registered", () => {
    expect(module, "LM-020 must self-register on import").toBeDefined();
  });

  it("StartOfOpponentsTurn clause produces at least one effect at OnStartTurn timing", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnStartTurn, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

  it("WhenDigivolving timing has at least one effect (the digivolving clause)", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

  it("declares Digimon, gains only Digimon-effect immunity, and returns the matching reveal to deck bottom", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "LM-020", as: "quantumon", suspended: true }] },
      1: {
        battleArea: [
          { card: "ST3-11", as: "attacker", dp: 1000, suspended: true },
          { card: "BT1-045", as: "yellowSource" },
        ],
        deck: [
          { card: "LM-016", as: "revealed" },
          { card: "BT1-009", as: "drawn" },
          { card: "BT1-085", as: "tail" },
        ],
        hand: [{ card: "ST3-14", as: "option" }],
      },
    });
    s.state.turnSeat = 1;
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 10;
    const resolving = s.engine.runOneTurn();
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const category = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: category.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseOption" && s.state.pendingDecision.decisionId !== category.decisionId,
    );
    const placement = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placement.decisionId,
        response: { kind: "chooseOption", optionIndex: 1 },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("tail").instanceId,
      s.inst("revealed").instanceId,
    ]);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("quantumon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("quantumon").currentDP).toBe(13000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("quantumon"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("quantumon"), "beAffected", "Option")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("quantumon").currentDP === 11000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await resolving;
    expect(s.perm("quantumon").currentDP).toBe(13000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("quantumon"), "beAffected", "Digimon")).toBe(false);
  });

  it("returns a matching category reveal to the top when that placement is chosen", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "LM-020", as: "quantumon" }] },
      1: {
        deck: [
          { card: "LM-016", as: "revealed" },
          { card: "BT1-009", as: "drawn" },
          { card: "BT1-085", as: "tail" },
        ],
      },
    });
    s.state.turnSeat = 1;
    s.state.isFirstPlayersFirstTurn = false;

    const resolving = s.engine.runOneTurn();
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const category = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: category.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseOption" && s.state.pendingDecision.decisionId !== category.decisionId,
    );
    const placement = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placement.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId)).toBe(true);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("drawn").instanceId,
      s.inst("tail").instanceId,
    ]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await resolving;
  });

  it.each([
    ["Tamer", 1, "BT1-085", false],
    ["Digimon", 0, "LM-016", true],
  ] as const)(
    "declaring %s decides whether a Tamer's effect can stop it attacking",
    async (_category, optionIndex, revealedCard, restricted) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "LM-020", as: "quantumon" }] },
          1: {
            battleArea: [{ card: "BT25-091", as: "monica" }],
            deck: [{ card: revealedCard }, { card: "BT1-009" }, { card: "BT1-009" }],
            hand: [{ card: "BT25-094", as: "tsOption" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      s.state.isFirstPlayersFirstTurn = false;
      s.state.memory = 10;
      const resolving = s.engine.runOneTurn();
      for (const response of [optionIndex, 1]) {
        await settle(() => s.state.pendingDecision?.kind === "chooseOption" && s.state.pendingDecision.seat === 0);
        const decision = s.state.pendingDecision!;
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: decision.decisionId,
            response: { kind: "chooseOption", optionIndex: response },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.state.pendingDecision?.decisionId !== decision.decisionId);
      }
      await advance(s.engine).waitForMainPhase(1);

      expect(
        s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tsOption").instanceId, useAs: "option" }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(() => s.perm("monica").isSuspended && s.state.pendingDecision === undefined);
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.perm("monica").isSuspended).toBe(true);
      expect(observe(s.engine).hasRestriction(s.perm("quantumon"), "attack")).toBe(restricted);
      advance(s.engine).endMainPhaseIfOpen(1);
      await resolving;
    },
  );
});

describe("LM-020 Quantumon — KB Q&A rulings", () => {
  const DECLARE = { Digimon: 0, Tamer: 1, Option: 2, DigiEgg: 3 } as const;
  const RETURN_TO = { top: 0, bottom: 1 } as const;

  async function answerOption(s: ReturnType<typeof setupEngine>, optionIndex: number) {
    await settle(() => s.state.pendingDecision?.kind === "chooseOption" && s.state.pendingDecision.seat === 0);
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseOption", optionIndex },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.decisionId !== decision.decisionId);
  }

  async function startOpponentTurn(board: BoardSpec, category: number, returnTo: number) {
    const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 1;
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 10;
    await s.ready();
    const resolving = s.engine.runOneTurn();
    await answerOption(s, category);
    await answerOption(s, returnTo);
    await advance(s.engine).waitForMainPhase(1);
    const finish = async () => {
      advance(s.engine).endMainPhaseIfOpen(1);
      await resolving;
    };
    return { s, finish };
  }

  function immuneTo(s: ReturnType<typeof setupEngine>, category: string) {
    return observe(s.engine).isRestrictedByEffect(s.perm("quantumon"), "beAffected", category);
  }

  it("can be chosen for Sethmon's deletion while unaffected by Digimon effects, so only the opponent's Digimon is deleted (Q2657)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-020", as: "quantumon" },
            { card: "BT21-094", as: "armorDigivolution" },
            { card: "BT21-035", as: "flamedramon", under: [{ card: "BT21-032", as: "veemon" }], suspended: true },
          ],
          hand: [{ card: "BT16-070", as: "sethmon" }],
        },
        1: {
          battleArea: [{ card: "BT10-055", as: "gryphonmon" }],
          deck: [{ card: "BT1-009", as: "revealedDigimon" }, "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.turnSeat = 1;
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 10;
    await s.ready();
    preferInstanceIds.push(s.perm("quantumon").topCard.instanceId);

    const resolving = s.engine.runOneTurn();
    await answerOption(s, DECLARE.Digimon);
    await answerOption(s, RETURN_TO.bottom);
    await advance(s.engine).waitForMainPhase(1);
    expect(immuneTo(s, "Digimon")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("gryphonmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("flamedramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.cardId === "BT10-055") &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
      2000,
    );

    const ownBoard = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId);
    expect(ownBoard).toEqual(expect.arrayContaining(["LM-020", "BT16-070"]));
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT21-035", "BT21-094"]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("LM-020");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(1);
    await resolving;
  });

  it("declares a category, reveals the opponent's top card, and is immune only on a match; the card returns to top or bottom (Q4003)", async () => {
    const matched = await startOpponentTurn(
      {
        0: { battleArea: [{ card: "LM-020", as: "quantumon" }] },
        1: {
          deck: [
            { card: "ST3-14", as: "revealed" },
            { card: "BT1-009", as: "drawn" },
            { card: "BT1-085", as: "tail" },
          ],
        },
      },
      DECLARE.Option,
      RETURN_TO.bottom,
    );
    expect(immuneTo(matched.s, "Option")).toBe(true);
    expect(immuneTo(matched.s, "Digimon")).toBe(false);
    expect(matched.s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      matched.s.inst("tail").instanceId,
      matched.s.inst("revealed").instanceId,
    ]);
    await matched.finish();

    const missed = await startOpponentTurn(
      {
        0: { battleArea: [{ card: "LM-020", as: "quantumon" }] },
        1: {
          deck: [
            { card: "BT1-009", as: "revealed" },
            { card: "BT1-010", as: "next" },
          ],
        },
      },
      DECLARE.Tamer,
      RETURN_TO.top,
    );
    expect(immuneTo(missed.s, "Tamer")).toBe(false);
    expect(immuneTo(missed.s, "Digimon")).toBe(false);
    expect(missed.s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(
      missed.s.inst("revealed").instanceId,
    );
    await missed.finish();
  });

  it("may declare Digi-Egg cards even though no Digi-Egg can be revealed from a deck (Q4004)", async () => {
    const { s, finish } = await startOpponentTurn(
      {
        0: { battleArea: [{ card: "LM-020", as: "quantumon" }] },
        1: { deck: ["BT1-009", "BT1-010"] },
      },
      DECLARE.DigiEgg,
      RETURN_TO.top,
    );
    const categoryPrompt = s.decisions.find(({ req }) => req.sourceCardId === "LM-020" && req.kind === "chooseOption")!;
    expect(categoryPrompt.req.options?.choices).toContain("Declare category: DigiEgg");
    for (const category of ["Digimon", "Tamer", "Option", "DigiEgg"]) expect(immuneTo(s, category)).toBe(false);
    await finish();
  });

  it("is still affected by an inherited effect on a Tamer card under an opponent's Digimon while immune to Tamer effects (Q4005)", async () => {
    const { s, finish } = await startOpponentTurn(
      {
        0: {
          battleArea: [{ card: "LM-020", as: "quantumon", under: [{ card: "BT1-009", as: "bottom" }, "BT1-010"] }],
          security: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", under: ["BT18-089"] }],
          deck: ["BT1-085", "BT1-009", "BT1-010"],
        },
      },
      DECLARE.Tamer,
      RETURN_TO.bottom,
    );
    expect(immuneTo(s, "Tamer")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking(), 2000);
    await advance(s.engine).finishAttack();

    expect(s.perm("quantumon").stack.map((card) => card.instanceId)).not.toContain(s.inst("bottom").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
    await finish();
  });

  it("still gains the inherited effects of its digivolution cards while immune to Digimon effects (Q4006)", async () => {
    const { s, finish } = await startOpponentTurn(
      {
        0: { battleArea: [{ card: "LM-020", as: "quantumon", under: ["BT12-067"] }] },
        1: { deck: ["LM-016", "BT1-009", "BT1-010"] },
      },
      DECLARE.Digimon,
      RETURN_TO.bottom,
    );
    expect(immuneTo(s, "Digimon")).toBe(true);
    expect(s.perm("quantumon").currentDP).toBe(14000);
    await finish();
  });

  it("isn't affected by a continuous effect of its controller's other Digimon while immune to Digimon effects (Q4007)", async () => {
    const board = (revealed: string): BoardSpec => ({
      0: {
        battleArea: [
          { card: "LM-020", as: "quantumon" },
          { card: "BT18-045", as: "pomumon", suspended: true },
        ],
      },
      1: { deck: [revealed, "BT1-009", "BT1-010"] },
    });

    const unaffected = await startOpponentTurn(board("LM-016"), DECLARE.Digimon, RETURN_TO.bottom);
    expect(immuneTo(unaffected.s, "Digimon")).toBe(true);
    expect(unaffected.s.perm("quantumon").currentDP).toBe(13000);
    await unaffected.finish();

    const control = await startOpponentTurn(board("BT1-085"), DECLARE.Digimon, RETURN_TO.bottom);
    expect(immuneTo(control.s, "Digimon")).toBe(false);
    expect(control.s.perm("quantumon").currentDP).toBe(14000);
    await control.finish();
  });

  it("isn't affected by a triggered effect of its controller's other Digimon while immune to Digimon effects (Q4011)", async () => {
    const board = (revealed: string): BoardSpec => ({
      0: {
        battleArea: [
          { card: "LM-020", as: "quantumon" },
          { card: "EX7-054", as: "blackGatomon" },
        ],
        hand: ["BT1-009"],
      },
      1: { deck: [revealed, "BT1-009", "BT1-010"] },
    });

    for (const [revealed, immune] of [
      ["LM-016", true],
      ["BT1-085", false],
    ] as const) {
      const { s, finish } = await startOpponentTurn(board(revealed), DECLARE.Digimon, RETURN_TO.bottom);
      expect(immuneTo(s, "Digimon")).toBe(immune);

      await advance(s.engine).verb.deletePermanent([s.perm("blackGatomon").permanentId]);
      await settle(() => s.state.pendingDecision === undefined, 2000);

      expect(observe(s.engine).hasKeyword(s.perm("quantumon"), "Blocker"), revealed).toBe(!immune);
      await finish();
    }
  });

  async function digivolveQuantumonPlacing(placement: "mother" | "token" | "fodder", watcher: string) {
    const preferred: string[] = [];
    const placed =
      placement === "mother"
        ? { card: "EX2-007", as: "placed" }
        : placement === "token"
          ? { card: "TOKEN-Diaboromon", as: "placed" }
          : { card: "LM-016", as: "placed" };
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-036", as: "base" }, placed, { card: watcher, as: "watcher" }],
          hand: [{ card: "LM-020", as: "quantumon" }],
          security: ["BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "victim", dp: 12000 }],
          security: [{ card: "BT1-009", as: "securityTop" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("placed").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("quantumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.length === 1 && s.state.pendingDecision === undefined, 2000);
    return s;
  }

  it("uses Mother D-Reaper as the placement, which goes to the Digi-Egg deck and adds nothing to security (Q4008)", async () => {
    const s = await digivolveQuantumonPlacing("mother", "LM-023");

    expect(s.state.players[0]!.eggDeck.at(-1)?.cardId).toBe("EX2-007");
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.perm("victim").currentDP).toBe(12000);

    const control = await digivolveQuantumonPlacing("fodder", "LM-023");
    expect(control.state.players[0]!.security.map((card) => card.cardId)).toEqual(["LM-016", "BT1-011"]);
    expect(control.perm("victim").currentDP).toBe(6000);
  });

  it("uses its own token as the placement, which leaves the game and adds nothing to security (Q4009)", async () => {
    const s = await digivolveQuantumonPlacing("token", "LM-023");

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "TOKEN-Diaboromon")).toBe(false);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.perm("victim").currentDP).toBe(12000);
  });

  it('doesn\'t trigger "when a card is removed from your security stack" for Mother D-Reaper or a token placement (Q4010)', async () => {
    const baseline = await digivolveQuantumonPlacing("fodder", "BT1-009");
    for (const placement of ["mother", "token"] as const) {
      const s = await digivolveQuantumonPlacing(placement, "BT13-036");
      expect(s.state.memory, placement).toBe(baseline.state.memory);
      expect(
        s.state.players[0]!.security.map((card) => card.cardId),
        placement,
      ).toEqual(["BT1-011"]);
    }
  });
});
