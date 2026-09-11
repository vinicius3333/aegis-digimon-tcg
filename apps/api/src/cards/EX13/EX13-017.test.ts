import { digivolutionRequirementsFor, getCardDefinition, Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX13-017.js";

const cardId = "EX13-017";

describe("EX13-017 Veemon", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "Veemon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Free"],
      types: ["Mini Dragon", "CS"],
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      effectText:
        "[Digivolve] Lv.2 w/[CS] trait: Cost 0 \n\n[When Moving] [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Veedramon] in its text or the [Royal Knight] trait among them to the hand. Return the rest to the bottom of the deck.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon with [Veedramon] in its name would leave the battle area by your opponent's effects, by suspending it, it doesn't leave.",
    });
  });

  it("compiles every printed clause: one union add slot, the CS alternate, and the inherited guard", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);

    // The same clause is printed under two timings, so both carry the identical action.
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.isInherited).toBeUndefined();
      expect(effect.actions).toEqual([
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  { tokens: ["Veedramon"], match: "text" },
                  { tokens: ["Royal Knight"], match: "trait", orPrevious: true },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
        },
      ]);
    }

    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(inherited.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "opponentEffect",
      sourceFilter: { isSelfRef: true, nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }] },
      actions: [{ kind: "Prevent", mode: "leavePlay", optional: true, abortOnDecline: true }],
    });
  });

  // ---------------------------------------------------------------------------
  // [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Veedramon] in its
  // text or the [Royal Knight] trait among them to the hand. Return the rest to the
  // bottom of the deck.
  // ---------------------------------------------------------------------------

  it("adds a Veedramon-named card to hand and bottoms the other two revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "source" }],
          deck: [
            { card: "BT22-022", as: "veedramon" },
            { card: "BT1-009", as: "firstRest" },
            { card: "BT1-010", as: "secondRest" },
            { card: "BT1-011", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId: id }) => id === "BT22-022"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("veedramon").instanceId]);
    // Only the top 3 were revealed: the 4th card stays on top, the rest go underneath it.
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("untouched").instanceId,
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("matches a card that only PRINTS [Veedramon] without being named it", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "source" }],
          deck: [
            { card: "BT1-009", as: "restA" },
            { card: "BT22-019", as: "printsVeedramon" },
            { card: "BT1-010", as: "restB" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId: id }) => id === "BT22-019"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("printsVeedramon").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("restA").instanceId,
      s.inst("restB").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("takes the [Royal Knight] trait branch of the same union slot", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "source" }],
          deck: [
            { card: "BT1-009", as: "restA" },
            { card: "BT1-010", as: "restB" },
            { card: "AD1-017", as: "royalKnight" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId: id }) => id === "AD1-017"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("royalKnight").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("restA").instanceId,
      s.inst("restB").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("adds exactly one card even when two of the three revealed cards match", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "source" }],
          deck: [
            { card: "BT22-022", as: "veedramon" },
            { card: "AD1-017", as: "royalKnight" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);
    await drainMicrotasks(20);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)[0]).toBeOneOf(["BT22-022", "AD1-017"]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.deck.map(({ cardId: id }) => id)).toContain("BT1-009");
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("discriminates the filter: a [Royal Base] trait and plain Digimon are all bottomed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "source" }],
          // FunBeemon carries [Royal Base], the near-miss trait; neither other card prints
          // [Veedramon]. "the [Royal Knight] trait" is exact, so nothing qualifies.
          deck: [
            { card: "BT18-044", as: "royalBase" },
            { card: "BT1-009", as: "plain" },
            { card: "BT1-010", as: "alsoPlain" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await drainMicrotasks(20);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("royalBase").instanceId,
      s.inst("plain").instanceId,
      s.inst("alsoPlain").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("never reveals the opponent's deck", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "source" }],
          deck: [
            { card: "BT1-009", as: "restA" },
            { card: "BT1-010", as: "restB" },
            { card: "BT1-011", as: "restC" },
          ],
        },
        1: { deck: [{ card: "BT22-022", as: "theirVeedramon" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await drainMicrotasks(20);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("theirVeedramon").instanceId]);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // [When Moving] — the same clause on the public breeding-move route.
  // ---------------------------------------------------------------------------

  it("fires the same clause when it moves out of breeding", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: cardId, as: "source" },
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [
            { card: "AD1-017", as: "royalKnight" },
            { card: "BT1-010", as: "restA" },
            { card: "BT1-011", as: "restB" },
            { card: "BT1-012", as: "drawn" },
          ],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-010"], deck: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("source").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId: id }) => id === "AD1-017"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("royalKnight").instanceId);
    // The 4th card is never revealed, so it stays on top and the two unwanted cards go under it.
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("drawn").instanceId,
      s.inst("restA").instanceId,
      s.inst("restB").instanceId,
    ]);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] Lv.2 w/[CS] trait: Cost 0, alongside the printed blue Lv.2 route.
  // ---------------------------------------------------------------------------

  it("exposes only the CS alternate as an extra requirement", () => {
    expect(digivolutionRequirementsFor(cardId)).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);
  });

  it("digivolves for 0 by the printed blue route and by the off-color CS alternate", async () => {
    for (const [baseCardId, useAlternateCost] of [
      // BT12-002 DemiVeemon is the blue Lv.2 printed route; BT22-004 Wanyamon is GREEN with
      // the [CS] trait, so only the alternate makes it a legal base.
      ["BT12-002", false],
      ["BT22-004", true],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: baseCardId, as: "base" }],
            hand: [{ card: cardId, as: "veemon" }],
            deck: [
              { card: "BT1-009", as: "bonusDraw" },
              { card: "BT1-010", as: "kept" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 0;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("veemon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === cardId);

      // Cost 0 on both routes, plus the digivolution bonus draw.
      expect(s.state.memory).toBe(0);
      expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([baseCardId]);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
      expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("kept").instanceId]);
    }
  });

  it("rejects the alternate over a level-2 card without the CS trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "base" }], hand: [{ card: cardId, as: "veemon" }] },
    });
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("veemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.perm("base").topCard?.cardId).toBe("BT1-001");
  });

  it("hatches over a DemiVeemon egg and keeps the source stack identity", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "EX13-002", as: "egg" }],
        hand: [{ card: cardId, as: "veemon" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    s.state.phase = Phase.Breeding;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX13-002");
    s.state.phase = Phase.Main;

    const permanentId = s.state.players[0]!.breeding!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("veemon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === cardId);

    // The breeding area holds no [On Play]/[When Moving] timing, so the reveal has not run yet.
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(["EX13-002"]);
    // The digivolution bonus draw is the only card that moves: the reveal has not run, since the
    // breeding area holds no [On Play]/[When Moving] timing.
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // Inherited [All Turns] [Once Per Turn] When this Digimon with [Veedramon] in its name
  // would leave the battle area by your opponent's effects, by suspending it, it doesn't leave.
  // ---------------------------------------------------------------------------

  it("suspends a Veedramon host to prevent one opponent-effect deletion but not a second", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-022", under: [cardId], as: "host" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    // No player Intent produces an opponent-effect deletion; the public advance verb drives the
    // same production leave event.
    advance(s.engine).verb.enterEffectResolution(1 as Seat, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
      expect(s.perm("host").isSuspended).toBe(true);
      expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([cardId]);
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT22-022", cardId]));
  });

  it("resets the once-per-turn guard on the controller's next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-022", under: [cardId], as: "host" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          hand: [{ card: "BT1-010", as: "opponentSpare" }],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1 as Seat, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
    expect(s.perm("host").isSuspended).toBe(true);

    // A full opponent turn, then the owner's next turn, through the real turn loop. The host
    // unsuspends at the start of its controller's turn, so the suspension cost is payable again.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);

    advance(s.engine).verb.enterEffectResolution(1 as Seat, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT22-022"]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("does not protect a host without [Veedramon] in its name", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-020", under: [cardId], as: "plainHost" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("plainHost").permanentId;

    advance(s.engine).verb.enterEffectResolution(1 as Seat, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT22-020")).toBe(true);
  });

  it("does not protect against the controller's own effects or battle", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-022", under: [cardId], as: "host" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(0 as Seat, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
