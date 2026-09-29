import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type CardSpec } from "../../engine/testkit/harness.js";
import "./BT10-019.js";
import "./BT10-021.js";
import "./BT10-024.js";
import "./BT10-088.js";
import "./BT10-097.js";

describe("BT10-097 Blazing Memory Boost!", () => {
  it("adds 2 Blue Flare cards, plays Kiriha, bottoms the rest, and enters the battle area", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-017"],
          hand: [{ card: "BT10-097", as: "option" }],
          deck: [
            { card: "BT10-019", as: "blueFlare1" },
            { card: "BT10-021", as: "blueFlare2" },
            { card: "BT10-088", as: "kiriha" },
            { card: "BT1-009", as: "rest1" },
            { card: "BT1-010", as: "rest2" },
            { card: "BT1-011", as: "rest3" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    const optionId = s.inst("option").instanceId;
    preferred.push(s.inst("blueFlare1").instanceId, s.inst("blueFlare2").instanceId, s.inst("kiriha").instanceId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId) &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("kiriha").instanceId,
        ) &&
        s.state.players[0]!.deck.length === 3,
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("blueFlare1").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("blueFlare2").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("rest1").instanceId,
      s.inst("rest2").instanceId,
      s.inst("rest3").instanceId,
    ]);
  });

  it("cannot play Kiriha when it must be taken as one of fewer than 2 available Blue Flare cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-017"],
          hand: [{ card: "BT10-097", as: "option" }],
          deck: [
            { card: "BT10-019", as: "blueFlare" },
            { card: "BT10-088", as: "kiriha" },
            "BT1-009",
            "BT1-010",
            "BT1-011",
            "BT1-012",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("kiriha").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("kiriha").instanceId),
    ).toBe(false);
  });

  it("may decline the reveal branch but still places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-017"],
          hand: [{ card: "BT10-097", as: "option" }],
          deck: ["BT10-019", "BT10-021", "BT10-088", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    const optionId = s.inst("option").instanceId;
    const deckOrder = s.state.players[0]!.deck.map((card) => card.instanceId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckOrder);
  });

  it("Security places itself in the battle area", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT10-097", as: "option", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("option").instanceId),
    ).toBe(true);
  });

  it("exposes its Delay activation while established in the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-097", as: "option" }] } });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).activatableEffects(s.perm("option"))).toEqual(
      expect.arrayContaining([expect.objectContaining({ description: expect.stringMatching(/delay/i) })]),
    );
  });

  it("executes the Blue Flare deck line from Blazing Memory Boost through Rush and Material Save", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-018", as: "blueSource" }],
          hand: [
            { card: "BT10-097", as: "boost" },
            { card: "BT10-024", as: "metalGreymon" },
          ],
          deck: [
            { card: "BT10-019", as: "greymon" },
            { card: "BT10-021", as: "mailbirdramon" },
            { card: "BT10-088", as: "kiriha" },
            "BT1-009",
            "BT1-010",
            "BT1-011",
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstFrozen" },
            { card: "BT1-011", as: "secondFrozen" },
          ],
          security: ["BT5-086", "BT5-086"],
          deck: ["BT1-009"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderCards: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId, s.inst("kiriha").instanceId);
    s.state.memory = 10;
    const boostId = s.inst("boost").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("boost").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("greymon").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("mailbirdramon").instanceId) &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("kiriha").instanceId,
        ) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === boostId),
    );
    const boost = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === boostId)!;
    const kiriha = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("kiriha").instanceId,
    )!;

    s.state.turnCount += 1;
    await s.engine.recomputeContinuousEffects();
    const activatableEffects = observe(s.engine).activatableEffects(boost) as Array<{
      description: string;
      effectKey: string;
    }>;
    const delay = activatableEffects.find((entry) => /delay/i.test(entry.description));
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: boost.topCard.instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 7 && s.state.players[0]!.trash.some((card) => card.instanceId === boost.topCard.instanceId),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      ["firstFrozen", "secondFrozen"].every(
        (alias) =>
          observe(s.engine).isRestricted(s.perm(alias), "attack") &&
          observe(s.engine).isRestricted(s.perm(alias), "block"),
      ),
    );
    const metalGreymon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("metalGreymon").instanceId,
    )!;
    expect(observe(s.engine).hasKeyword(metalGreymon, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(metalGreymon, "MaterialSave")).toBe(true);
    expect(metalGreymon.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: metalGreymon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === metalGreymon.permanentId) &&
        kiriha.stack.length === 2,
    );

    expect(kiriha.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId]),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("metalGreymon").instanceId)).toBe(true);
  });
});

describe("BT10-097 Blazing Memory Boost! — KB Q&A rulings", () => {
  type Setup = ReturnType<typeof setupEngine>;

  const nonBlueFlareFiller = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];

  function boardWithDeck(deck: CardSpec[]) {
    return { 0: { battleArea: [{ card: "BT10-017" }], hand: [{ card: "BT10-097", as: "boost" }], deck } };
  }

  async function playBoost(s: Setup): Promise<() => boolean> {
    const boostId = s.inst("boost").instanceId;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: boostId })).toEqual({ ok: true });
    return () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === boostId);
  }

  function inBattleArea(s: Setup, alias: string): boolean {
    return s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst(alias).instanceId,
    );
  }

  function inHand(s: Setup, alias: string): boolean {
    return s.state.players[0]!.hand.some((card) => card.instanceId === s.inst(alias).instanceId);
  }

  function isRevealCandidate(s: Setup, alias: string) {
    return (entry: Setup["decisions"][number]) =>
      entry.req.kind === "selectCards" &&
      (entry.req.options?.candidateInstanceIds ?? []).includes(s.inst(alias).instanceId);
  }

  async function awaitSelection(s: Setup, alias: string, answered: Set<string>) {
    await settle(() =>
      s.decisions.some((entry) => isRevealCandidate(s, alias)(entry) && !answered.has(entry.req.decisionId)),
    );
    const decision = s.decisions.find(
      (entry) => isRevealCandidate(s, alias)(entry) && !answered.has(entry.req.decisionId),
    )!;
    answered.add(decision.req.decisionId);
    return decision.req;
  }

  function respond(s: Setup, decisionId: string, aliases: string[]) {
    return s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId,
      response: { kind: "selectCards", instanceIds: aliases.map((alias) => s.inst(alias).instanceId) },
    });
  }

  it("plays a revealed [Kiriha Aonuma] without paying its memory cost (Q2030)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      boardWithDeck([
        { card: "BT10-019", as: "greymon" },
        { card: "BT10-021", as: "mailBirdramon" },
        { card: "BT10-088", as: "kiriha" },
        ...nonBlueFlareFiller.slice(0, 3),
      ]),
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("greymon").instanceId, s.inst("mailBirdramon").instanceId, s.inst("kiriha").instanceId);

    const boostInBattleArea = await playBoost(s);
    await settle(boostInBattleArea);

    expect(inBattleArea(s, "kiriha")).toBe(true);
    expect(inHand(s, "kiriha")).toBe(false);
    expect(s.state.memory).toBe(5);
  });

  it("adds only 1 card when only 1 [Blue Flare] card is revealed (Q2031)", async () => {
    const s = setupEngine(boardWithDeck([{ card: "BT10-019", as: "greymon" }, "BT10-017", ...nonBlueFlareFiller]), {
      autoAcceptOptional: true,
      autoOrderCards: true,
    });
    const answered = new Set<string>();

    const boostInBattleArea = await playBoost(s);
    const addToHand = await awaitSelection(s, "greymon", answered);

    expect(addToHand.options?.candidateInstanceIds).toEqual([s.inst("greymon").instanceId]);
    expect(respond(s, addToHand.decisionId, ["greymon"])).toEqual({ ok: true });
    await settle(boostInBattleArea);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("greymon").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(5);
  });

  it("cannot play [Kiriha Aonuma] when it must be one of the 2 [Blue Flare] cards added to hand (Q2032)", async () => {
    const s = setupEngine(
      boardWithDeck([{ card: "BT10-019", as: "greymon" }, { card: "BT10-088", as: "kiriha" }, ...nonBlueFlareFiller]),
      { autoAcceptOptional: true, autoOrderCards: true },
    );
    const answered = new Set<string>();

    const boostInBattleArea = await playBoost(s);
    const addToHand = await awaitSelection(s, "kiriha", answered);

    expect(respond(s, addToHand.decisionId, ["greymon"]).ok).toBe(false);
    expect(respond(s, addToHand.decisionId, ["greymon", "kiriha"])).toEqual({ ok: true });
    await settle(boostInBattleArea);

    expect(inHand(s, "kiriha")).toBe(true);
    expect(inHand(s, "greymon")).toBe(true);
    expect(inBattleArea(s, "kiriha")).toBe(false);
    expect(s.state.memory).toBe(5);
  });

  function kirihaWithTwoOtherBlueFlareCards() {
    return setupEngine(
      boardWithDeck([
        { card: "BT10-019", as: "greymon" },
        { card: "BT10-021", as: "mailBirdramon" },
        { card: "BT10-088", as: "kiriha" },
        ...nonBlueFlareFiller.slice(0, 3),
      ]),
      { autoAcceptOptional: true, autoOrderCards: true },
    );
  }

  it("rejects an empty add or an empty [Kiriha Aonuma] play once the effect is used", async () => {
    const s = kirihaWithTwoOtherBlueFlareCards();
    const answered = new Set<string>();

    const boostInBattleArea = await playBoost(s);
    const addToHand = await awaitSelection(s, "greymon", answered);

    expect(respond(s, addToHand.decisionId, []).ok).toBe(false);
    expect(respond(s, addToHand.decisionId, ["greymon", "mailBirdramon"])).toEqual({ ok: true });
    const playKiriha = await awaitSelection(s, "kiriha", answered);

    expect(respond(s, playKiriha.decisionId, []).ok).toBe(false);
    expect(respond(s, playKiriha.decisionId, ["kiriha"])).toEqual({ ok: true });
    await settle(boostInBattleArea);

    expect(inHand(s, "greymon")).toBe(true);
    expect(inHand(s, "mailBirdramon")).toBe(true);
    expect(inBattleArea(s, "kiriha")).toBe(true);
  });

  // Engine gap: RevealAdd resolves each add slot on its own, so the hand slot accepts
  // [Kiriha Aonuma] even when that leaves nothing for the mandatory play slot.
  it.fails("must perform both the add and the [Kiriha Aonuma] play once the effect is used (Q2033)", async () => {
    const s = kirihaWithTwoOtherBlueFlareCards();
    const answered = new Set<string>();

    const boostInBattleArea = await playBoost(s);
    const addToHand = await awaitSelection(s, "greymon", answered);

    expect(respond(s, addToHand.decisionId, []).ok).toBe(false);
    expect(respond(s, addToHand.decisionId, ["greymon", "kiriha"]).ok).toBe(false);
    expect(respond(s, addToHand.decisionId, ["greymon", "mailBirdramon"])).toEqual({ ok: true });
    const playKiriha = await awaitSelection(s, "kiriha", answered);

    expect(respond(s, playKiriha.decisionId, []).ok).toBe(false);
    expect(respond(s, playKiriha.decisionId, ["kiriha"])).toEqual({ ok: true });
    await settle(boostInBattleArea);

    expect(inHand(s, "greymon")).toBe(true);
    expect(inHand(s, "mailBirdramon")).toBe(true);
    expect(inBattleArea(s, "kiriha")).toBe(true);
  });
});
