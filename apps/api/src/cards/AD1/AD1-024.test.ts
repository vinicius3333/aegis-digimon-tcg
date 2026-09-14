import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../../cards/index.js";

describe("AD1-024 Imperialdramon: Fighter Mode", () => {
  it("offers All Turns again after a declined play trigger in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-024", as: "fighter", suspended: true }],
          hand: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle();
    const firstOffers = s.decisions.filter(
      ({ req }) => req.sourceCardId === "AD1-024" && req.kind === "optional",
    ).length;
    expect(firstOffers).toBeGreaterThan(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "AD1-024" && req.kind === "optional").length,
    ).toBeGreaterThan(firstOffers);
    expect(s.perm("fighter").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(false);
  });

  it("can accept a later effect-play after declining earlier play and evolution occurrences", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-024", as: "fighter", suspended: true },
            { card: "AD1-011", as: "base", under: [{ card: "ST2-03", as: "released" }] },
          ],
          hand: [
            { card: "BT1-010", as: "first" },
            { card: "ST9-06", as: "dragon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const answered = new Set<string>();
    let acceptedPlayedOccurrence = false;
    async function answerChoices() {
      for (let i = 0; i < 20; i++) {
        await settle();
        const offer = s.decisions.find(({ req }) => req.kind === "optional" && !answered.has(req.decisionId));
        if (!offer) return;
        answered.add(offer.req.decisionId);
        const playedByEffect = s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "ST2-03");
        const accept = offer.req.sourceCardId === "ST9-06" || playedByEffect;
        if (accept && offer.req.sourceCardId === "AD1-024") acceptedPlayedOccurrence = true;
        expect(
          s.engine.applyIntent(offer.seat, {
            type: "respondDecision",
            decisionId: offer.req.decisionId,
            response: { kind: "optional", accept },
          }),
        ).toEqual({ ok: true });
      }
      throw new Error("effect choices did not settle");
    }
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await answerChoices();
    expect(s.perm("fighter").isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dragon").instanceId,
      }),
    ).toEqual({ ok: true });
    await answerChoices();
    expect(acceptedPlayedOccurrence).toBe(true);
    const printed = getCardDefinition("AD1-024")!.effectText!;
    const allTurns = printed.slice(printed.indexOf("[All Turns]")).trim();
    const divider = allTurns.indexOf("Then,");
    const parts = new Set(
      s.decisions
        .filter(({ req }) => req.kind === "optional" && req.sourceCardId === "AD1-024")
        .map(({ req }) => req.options?.effectTextPart),
    );
    expect(parts).toEqual(new Set([allTurns.slice(0, divider).trim(), allTurns.slice(divider).trim()]));
    expect(s.perm("fighter").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("opponent").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not offer All Turns again after accepting a normal play (Q6519)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-024", as: "fighter", suspended: true },
            { card: "AD1-011", as: "base", under: ["ST2-03"] },
          ],
          hand: [
            { card: "BT1-010", as: "first" },
            { card: "ST9-06", as: "dragon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.perm("opponent").isSuspended).toBe(true);
    const offers = s.decisions.filter(({ req }) => req.sourceCardId === "AD1-024" && req.kind === "optional").length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dragon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "ST2-03")).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "AD1-024" && req.kind === "optional")).toHaveLength(
      offers,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-024");
    const compiled = registeredCompiledCards.get("AD1-024") ?? getCompiledCard("AD1-024");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-024");
    expect(definition?.nameEn).toBe("Imperialdramon: Fighter Mode");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("suspends an opposing Digimon and unsuspends itself when a Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-024", as: "fighter", suspended: true }],
          hand: [{ card: "BT1-010", as: "played" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended && !s.perm("fighter").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("fighter").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("unsuspends even when there is no opposing Digimon to suspend (Q6916)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-024", as: "fighter", suspended: true }],
          hand: [{ card: "BT1-010", as: "played" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("fighter").isSuspended === false);
    expect(s.perm("fighter").isSuspended).toBe(false);
  });

  it("self-triggers after effect-driven evolution and returns the suspended Digimon (Q6115)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-011", as: "paildramon" }], hand: [{ card: "AD1-024", as: "fighter" }] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }], security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("paildramon").topCard.cardId === "AD1-024");
    await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("reacts when the opponent plays a Digimon as well as when I play one", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-024", as: "fighter", suspended: true }] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }], hand: [{ card: "BT1-010", as: "played" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended && !s.perm("fighter").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("fighter").isSuspended).toBe(false);
  });

  it("shares one use between when-digivolving and when-attacking lowest-DP returns", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-030", as: "base" }], hand: [{ card: "AD1-024", as: "fighter" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "low", dp: 5000 },
            { card: "BT1-010", as: "high", dp: 6000 },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fighter").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("high").permanentId);
  });

  it("resets the shared lowest-DP return on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-024", as: "fighter" }],
          hand: ["BT1-009", "BT1-010"],
          deck: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first-low", dp: 5000 },
            { card: "BT1-010", as: "first-high", dp: 6000 },
          ],
          security: [
            "BT1-009",
            "BT1-010",
            "BT1-011",
            "BT1-012",
            "BT1-013",
            "BT1-014",
            "BT1-009",
            "BT1-010",
            "BT1-011",
            "BT1-012",
          ],
          hand: ["BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("fighter").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("first-high").permanentId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    const nextLow = s.putOnBoard(1, { card: "BT1-010", as: "next-low", dp: 4000 });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("fighter").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === nextLow.permanentId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("first-high").permanentId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("uses both alternate evolution routes and publishes its two keywords", async () => {
    for (const [baseCard, expectedMemory] of [
      ["BT12-030", 5],
      ["AD1-011", 1],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: "AD1-024", as: "fighter" }] },
      });
      s.state.memory = 6;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("fighter").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "AD1-024");
      expect(s.state.memory).toBe(expectedMemory);
    }

    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-024", as: "fighter" }] } });
    await s.ready();
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("fighter").permanentId, "SecurityAttack")).toBe(true);
    expect(continuous.hasKeyword(s.perm("fighter").permanentId, "Blocker")).toBe(true);
  });
});
