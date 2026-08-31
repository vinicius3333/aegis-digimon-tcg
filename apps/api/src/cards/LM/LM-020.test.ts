import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming, getCardDefinition, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { advance } from "../../engine/testkit/advance.js";
import "./LM-020.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

// LM-020 (Quantumon) — two clauses with dense official Q&A:
//
//  [When Digivolving] By placing 1 Digimon on top of its owner's security stack,
//  reveal all of your opponent's security cards, place 1 among them on top of your
//  opponent's deck, then shuffle the rest back.
//
//  [Start of Opponent's Turn] Declare 1 card category. Reveal the top card of your
//  opponent's deck. If it matches, this Digimon isn't affected by that category for
//  the turn. Return the revealed card to top or bottom of opponent's deck.
//  (Q4003 notes this text was errata'd to include the "top or bottom" return choice.)
//
// The behavioral cases below preserve the corrected security-placement and
// StartOfOpponentsTurn timing semantics against the production engine.

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
    isOwnersTurn: () => false, // this triggers on opponent's turn
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
    // No [Once Per Turn] is printed on the When Digivolving clause.
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
        1: { security: ["BT1-001", "BT1-085"] },
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
        1: { battleArea: [{ card: "LM-016", as: "theirs" }], security: ["BT1-001"] },
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

    // The Digimon lands in ITS OWNER's stack, never the resolving player's. The second half of
    // the clause then moves one of that stack's cards onto the same player's deck, so the card
    // ends up in one of those two zones — both belonging to its owner.
    expect(s.state.players[0]!.security.some((card) => card.cardId === "LM-016")).toBe(false);
    expect(
      s.state.players[1]!.security.some((card) => card.cardId === "LM-016") ||
        s.state.players[1]!.deck.some((card) => card.cardId === "LM-016"),
    ).toBe(true);
  });

  const module = getEffectModule("LM-020");

  it("is registered", () => {
    // Basic smoke test — the import side-effect must register the module.
    expect(module, "LM-020 must self-register on import").toBeDefined();
  });

  // Q4003: [Start of Opponent's Turn] fires at the START of the OPPONENT's turn.
  // The engine models that as the opponent's OnStartTurn window. The IR trigger
  // "StartOfOpponentsTurn" must map to EffectTiming.OnStartTurn, not to None.
  // Now PASSES: timingForTrigger() maps "StartOfOpponentsTurn" -> EffectTiming.OnStartTurn
  // and the turn-ownership guard restricts it to the opponent's turn.
  it("StartOfOpponentsTurn clause produces at least one effect at OnStartTurn timing", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnStartTurn, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

  // Q4003: No effect fires at WhenDigivolving for the Start-of-Opponent's-Turn clause —
  // wrong-timing sanity check (a separate guard from the main xfail above).
  it("WhenDigivolving timing has at least one effect (the digivolving clause)", () => {
    // Q4008/Q4009: the WhenDigivolving effect is real and fire-able; it must exist there.
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

  it("declares Digimon, gains only Digimon-effect immunity, and returns the matching reveal to deck bottom", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "LM-020", as: "quantumon" }] },
      1: {
        deck: [
          { card: "LM-016", as: "revealed" },
          { card: "BT1-085", as: "tail" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    const resolving = advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("quantumon"));
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
    await resolving;

    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("tail").instanceId,
      s.inst("revealed").instanceId,
    ]);

    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    try {
      await driver.verb.modifyDP(s.perm("quantumon").permanentId, -3000, EffectDuration.UntilOpponentTurnEnd);
    } finally {
      driver.verb.leaveEffectResolution();
    }
    expect(s.perm("quantumon").currentDP).toBe(13000);

    driver.verb.enterEffectResolution(1, ["Option"]);
    try {
      await driver.verb.modifyDP(s.perm("quantumon").permanentId, -1000, EffectDuration.UntilOpponentTurnEnd);
    } finally {
      driver.verb.leaveEffectResolution();
    }
    expect(s.perm("quantumon").currentDP).toBe(12000);
  });
});
