import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
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
