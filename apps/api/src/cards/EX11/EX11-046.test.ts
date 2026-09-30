import { digivolutionRequirementsFor, EffectTiming, getCardDefinition, type Seat } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const GALACTICMON = "EX11-046";
const GALACTICMON_BASE = "BT11-111";
const OPPONENT_CHEAP = "AD1-011";
const OPPONENT_COSTLY = "AD1-004";
const DECOY = "P-094";

describe("EX11-046 — [When Digivolving] mass-delete spares the highest-play-cost opponent Digimon", () => {
  it("captures the official Assembly -6 recipe", () => {
    expect(runtimeCompiledCard("EX11-046")?.assemblyRequirement).toEqual([
      { reduceCost: 6, materials: [{ nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }], count: 8 }] },
    ]);
  });
  it("preserves the printed card and only its two text evolution requirements", () => {
    expect(getCardDefinition(GALACTICMON)).toMatchObject({
      nameEn: "Galacticmon",
      colors: ["Black"],
      level: 6,
      playCost: 14,
      dp: 14000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 6 }],
      types: ["Unknown", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(GALACTICMON)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Snatchmon"], cost: 9, isAlternate: true },
      { namesExact: ["Galacticmon"], cost: 5, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(GALACTICMON)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects.find(({ trigger }) => trigger === "EndOfOpponentsTurn")?.actions).toMatchObject([
      {
        kind: "Digivolve",
        into: { nameOrTrait: [{ tokens: ["Galacticmon"], match: "nameExact" }] },
        from: ["hand", "trash"],
        payCost: false,
        ignoreRequirements: true,
        optional: true,
      },
    ]);
  });

  it("keeps the highest-play-cost opponent Digimon, deletes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GALACTICMON_BASE, as: "base" }],
          hand: [{ card: GALACTICMON, as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: OPPONENT_CHEAP, as: "cheap" },
            { card: OPPONENT_COSTLY, as: "costly" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;

    const base = s.perm("base");
    const cheap = s.perm("cheap");
    const costly = s.perm("costly");
    const evolving = s.inst("evolving");

    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });

    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === costly.permanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === cheap.permanentId)).toBe(false);
  });

  it("grants nothing when the evolving Digimon has only 3 Vemmon in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GALACTICMON_BASE, as: "base", under: ["BT11-061", "BT11-061", "BT11-061"] }],
          hand: [{ card: GALACTICMON, as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    const base = s.perm("base");
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.inst("evolving").instanceId,
    });
    await settle(() => base.topCard?.cardId === GALACTICMON);
    expect(observe(s.engine).hasKeyword(base, "Blocker")).toBe(false);
    assertNoLoudGap(s);
  });

  it("grants Blocker when the evolving Digimon has at least 4 Vemmon in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: GALACTICMON_BASE,
              as: "base",
              under: ["BT11-061", "BT11-061", "BT11-061", "BT11-061"],
            },
          ],
          hand: [{ card: GALACTICMON, as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;

    const base = s.perm("base");
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.inst("evolving").instanceId,
    });
    await settle(() => observe(s.engine).hasKeyword(base, "Blocker"));

    expect(base.topCard?.cardId).toBe(GALACTICMON);
    expect(base.stack.filter((card) => card.cardId === "BT11-061")).toHaveLength(4);
    expect(observe(s.engine).hasKeyword(base, "Blocker")).toBe(true);
    expect(runtimeCompiledCard(GALACTICMON)?.effects[1]?.actions[2]).toMatchObject({
      kind: "GrantImmunity",
      immuneFrom: "opponentEffects",
      duration: "untilOpponentTurnEnd",
      target: { filter: { isSelfRef: true }, isSelf: true },
      condition: { kind: "digivolutionCardCount", op: "gte", value: 4, nameOrTrait: [{ tokens: ["Vemmon"] }] },
    });
    assertNoLoudGap(s);
  });

  it("is not suspended by an opponent effect while four Vemmon immunity is active", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: GALACTICMON_BASE,
              as: "base",
              under: ["BT11-061", "BT11-061", "BT11-061", "BT11-061"],
            },
          ],
          hand: [{ card: GALACTICMON, as: "evolving" }],
          deck: ["BT1-009", "BT1-010", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponentVictim" }],
          hand: [{ card: "EX11-026", as: "opponentEffect" }],
          deck: ["BT1-013", "BT1-014", "BT1-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const galacticmon = s.perm("base");
    preferred.push(galacticmon.permanentId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: galacticmon.permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(galacticmon, "Blocker"));
    expect(galacticmon.stack.filter((card) => card.cardId === "BT11-061")).toHaveLength(4);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-026"));
    expect(galacticmon.isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("only digivolves into a card named [Galacticmon] at the end of the opponent's turn", async () => {
    const withHand = (hand: string) =>
      setupEngine(
        {
          0: { battleArea: [{ card: GALACTICMON, as: "self" }], hand: [{ card: hand, as: "candidate" }] },
          1: { security: ["BT1-009"], deck: ["BT1-010"], hand: ["BT1-011"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );

    const decoy = withHand(DECOY);
    decoy.state.turnSeat = 1;
    const decoyLoop = decoy.engine.runOneTurn();
    await settle(() => decoy.state.phase === "Main" && decoy.state.turnSeat === 1);
    expect(decoy.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await decoyLoop;
    expect(decoy.perm("self").topCard?.cardId).toBe(GALACTICMON);
    expect(decoy.state.players[0]!.hand.map((card) => card.cardId)).toContain(DECOY);

    const named = withHand(GALACTICMON_BASE);
    named.state.turnSeat = 1;
    const namedLoop = named.engine.runOneTurn();
    await settle(() => named.state.phase === "Main" && named.state.turnSeat === 1);
    expect(named.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await namedLoop;
    expect(named.perm("self").topCard?.cardId).toBe(GALACTICMON_BASE);
  });

  it("also digivolves into a [Galacticmon] sitting in the TRASH, and only into that name", async () => {
    const withTrash = (trashCard: string) =>
      setupEngine(
        {
          0: { battleArea: [{ card: GALACTICMON, as: "self" }], trash: [trashCard] },
          1: { security: ["BT1-009"], deck: ["BT1-010"], hand: ["BT1-011"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );

    const decoy = withTrash(DECOY);
    decoy.state.turnSeat = 1;
    const decoyLoop = decoy.engine.runOneTurn();
    await settle(() => decoy.state.phase === "Main" && decoy.state.turnSeat === 1);
    expect(decoy.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await decoyLoop;
    expect(decoy.perm("self").topCard?.cardId).toBe(GALACTICMON);
    expect(decoy.state.players[0]!.trash.map(({ cardId: id }) => id)).toContain(DECOY);

    const named = withTrash(GALACTICMON_BASE);
    named.state.turnSeat = 1;
    const namedLoop = named.engine.runOneTurn();
    await settle(() => named.state.phase === "Main" && named.state.turnSeat === 1);
    expect(named.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await namedLoop;
    expect(named.perm("self").topCard?.cardId).toBe(GALACTICMON_BASE);
    expect(named.perm("self").stack.map(({ cardId: id }) => id)).toEqual([GALACTICMON]);
  });

  it("Q6932: accepts P-244 Delay after BT21-062 publicly places Vemmon, then digivolves into EX11-046", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-058", as: "snatchmon" }],
          hand: [
            { card: "P-244", as: "emblem" },
            { card: "BT21-062", as: "bt21Galacticmon" },
            { card: "BT21-098", as: "cannon" },
            { card: GALACTICMON, as: "ex11Evolution" },
            { card: "BT11-061", as: "mainVemmon" },
          ],
          trash: ["BT21-056", "BT21-056", "BT11-065", "BT11-065"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: ["BT1-010"],
          deck: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
          security: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    const emblemInstanceId = s.inst("emblem").instanceId;
    const bt21InstanceId = s.inst("bt21Galacticmon").instanceId;
    const ex11InstanceId = s.inst("ex11Evolution").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: emblemInstanceId })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "P-244"));
    const playDecision = s.decisions.find(({ req }) => req.kind === "optional" && req.sourceCardId === "P-244")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === emblemInstanceId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const snatchmon = s.perm("snatchmon");
    preferred.push(snatchmon.permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: snatchmon.permanentId,
        instanceId: bt21InstanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT21-062"));
    const cannonDecision = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.sourceCardId === "BT21-062",
    )!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cannonDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.promptText.includes("Delay")));
    expect(
      s
        .perm("snatchmon")
        .stack.map(({ cardId }) => cardId)
        .filter((cardId) => cardId.startsWith("BT21-056")),
    ).toHaveLength(2);
    expect(
      s
        .perm("snatchmon")
        .stack.map(({ cardId }) => cardId)
        .filter((cardId) => cardId === "BT11-065"),
    ).toHaveLength(2);
    expect(s.perm("snatchmon").topCard?.cardId).toBe("BT21-062");
    const delayDecision = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.promptText.includes("Delay"),
    )!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: delayDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.promptText === "Digivolve"));
    const digivolveDecision = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.promptText === "Digivolve",
    )!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: digivolveDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(
      () => s.perm("snatchmon").topCard?.instanceId === ex11InstanceId && s.state.pendingDecision === undefined,
    );
    expect(s.perm("snatchmon").topCard?.cardId).toBe(GALACTICMON);
    expect(s.perm("snatchmon").stack).toHaveLength(6);
    expect(s.perm("snatchmon").stack.map(({ cardId }) => cardId)).toContain("BT21-062");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("P-244");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("BT21-098");
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("EX11-046 Galacticmon — KB Q&A rulings", () => {
  const FOUR_VEMMON = ["BT11-061", "BT11-061", "BT11-061", "BT11-061"];
  const DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];

  /** Seat 0's Galacticmon with 4 Vemmon under, beside seat 1's `opponent` board. */
  function board(opponent: { card: string; as: string }[], opponentHand: { card: string; as: string }[] = []) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: GALACTICMON, as: "galacticmon", under: FOUR_VEMMON }], deck: DECK, security: 1 },
        1: { battleArea: opponent, hand: opponentHand, deck: DECK, security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("galacticmon").permanentId, s.perm("galacticmon").topCard.instanceId);
    return s;
  }

  async function becomeImmune(s: EngineSetup): Promise<void> {
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("galacticmon"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).hasKeyword(s.perm("galacticmon"), "Blocker")).toBe(true);
  }

  async function fireOpponentOnPlay(s: EngineSetup, card: string): Promise<number> {
    const decisionsBefore = s.decisions.length;
    const source = s.putOnBoard(1, { card, as: "source" });
    await advance(s.engine).fire(EffectTiming.OnPlay, source);
    await settle(() => s.state.pendingDecision === undefined);
    return decisionsBefore;
  }

  async function duringMainPhase(s: EngineSetup, seat: Seat, memory: number, body: () => Promise<void>) {
    s.state.turnSeat = seat;
    s.state.memory = memory;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(seat);
    await body();
    advance(s.engine).endMainPhaseIfOpen(seat);
    await turn;
  }

  it("deletes every opposing Digimon when none has a play cost to choose (Q5895)", async () => {
    const s = board([
      { card: "TOKEN-Familiar-Token", as: "first" },
      { card: "TOKEN-Familiar-Token", as: "second" },
    ]);
    await s.ready();

    await becomeImmune(s);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("accepts Assembly materials whose [Vemmon] appears only in their effects (Q5896)", async () => {
    const materials = ["BT11-065", "BT11-070", "BT11-105", "BT18-092", "BT21-087", "EX11-066", "P-244", "BT18-065"];
    const s = setupEngine({
      0: {
        hand: [{ card: GALACTICMON, as: "target" }],
        trash: materials.map((card, index) => ({ card, as: `material${index}` })),
      },
    });
    s.state.memory = 10;
    for (const card of materials) expect(getCardDefinition(card)!.nameEn).not.toContain("Vemmon");

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("target").instanceId,
        assembly: { materialInstanceIds: materials.map((_, index) => s.inst(`material${index}`).instanceId) },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === GALACTICMON));

    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(8);
    expect(s.state.memory).toBe(2);
  });

  it.each([
    { card: "BT1-070", effect: "suspend" },
    { card: "BT1-055", effect: "-3000 DP" },
  ])("is not suspended or reduced by an opponent's effect ($effect) while immune (Q5897)", async ({ card }) => {
    const s = board([{ card: "AD1-004", as: "highest" }]);
    await s.ready();
    await becomeImmune(s);

    await fireOpponentOnPlay(s, card);

    expect(s.perm("galacticmon").isSuspended).toBe(false);
    expect(s.perm("galacticmon").currentDP).toBe(14000);
  });

  it("can still be chosen by an opponent's effect, which then does nothing to it (Q5898)", async () => {
    const s = board([{ card: "AD1-004", as: "highest" }]);
    await s.ready();
    await becomeImmune(s);

    const decisionsBefore = await fireOpponentOnPlay(s, "BT1-070");

    const choice = s.decisions
      .slice(decisionsBefore)
      .find(({ seat, req }) => seat === 1 && req.kind === "chooseTargets");
    expect(choice?.req.options?.candidateInstanceIds).toContain(s.perm("galacticmon").permanentId);
    expect(s.perm("galacticmon").isSuspended).toBe(false);
  });

  it("can be given <Security A. -1> by an opponent's effect without being considered to have it (Q5899)", async () => {
    const s = board([{ card: "AD1-004", as: "highest" }]);
    await s.ready();
    await becomeImmune(s);

    const eventsBefore = s.events.length;
    await fireOpponentOnPlay(s, "BT5-036");

    expect(
      s.events.slice(eventsBefore).some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT5-036"),
    ).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("galacticmon"), "SecurityAttack")).toBe(0);
  });

  it("stops being affected by an opponent's -3000 DP as soon as it becomes immune (Q5900)", async () => {
    const s = board([{ card: "BT1-055", as: "angemon" }]);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angemon"));
    await settle(() => s.perm("galacticmon").currentDP === 11000);
    expect(s.perm("galacticmon").currentDP).toBe(11000);

    await becomeImmune(s);

    expect(s.perm("galacticmon").currentDP).toBe(14000);
  });

  it("is affected by the <Security A. -1> it was given once its immunity ends (Q5901)", async () => {
    const s = board([{ card: "BT1-019", as: "highest" }], [{ card: "BT5-036", as: "renamon" }]);
    await s.ready();

    await duringMainPhase(s, 0, 3, async () => {
      await becomeImmune(s);
    });
    await duringMainPhase(s, 1, 10, async () => {
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT5-036"));
      await settle(() => s.state.pendingDecision === undefined);
      expect(observe(s.engine).keywordAmount(s.perm("galacticmon"), "SecurityAttack")).toBe(0);
    });
    await duringMainPhase(s, 0, 3, async () => {
      expect(observe(s.engine).keywordAmount(s.perm("galacticmon"), "SecurityAttack")).toBe(-1);
    });
  });

  it("does not trigger a given 'when this Digimon becomes suspended' effect while immune (Q5902)", async () => {
    const s = board([{ card: "BT14-044", as: "palmon" }]);
    await s.ready();

    await duringMainPhase(s, 0, 3, async () => {
      await becomeImmune(s);
    });
    await duringMainPhase(s, 1, 3, async () => {
      await settle(() => s.state.pendingDecision === undefined);
      s.state.memory = 3;
      s.putOnBoard(1, { card: "BT1-009", as: "attacker" });
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => observe(s.engine).blockingSeat() === 0);
      expect(
        s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("galacticmon").permanentId }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      expect(s.perm("galacticmon").isSuspended).toBe(true);
      expect(s.state.memory).toBe(3);
    });
  });
});
