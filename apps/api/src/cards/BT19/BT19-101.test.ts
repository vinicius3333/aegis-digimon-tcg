import { describe, expect, it } from "vitest";
import type { CardDefinition } from "@aegis/shared";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// Inert main-deck Digimon used for security, decks and near-miss peers. BT1-009 Monodramon
// has no printed effect; no Digi-Egg is ever seeded in security or in the main deck.
const INERT = "BT1-009";

describe("BT19-101 ZeedMillenniummon", () => {
  it("preserves Overclock, trash-to-top cost, conditional immunity, and alternate evolution", () => {
    const card = runtimeCompiledCard("BT19-101");

    expect(card).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ namesExact: ["MoonMillenniummon"], cost: 2, isAlternate: true }],
    });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Overclock" }] },
      ...["OnPlay", "WhenDigivolving", "WhenAttacking"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Return",
            to: "deckBottom",
            target: { filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" }, count: 1 },
            cost: {
              kind: "return",
              to: "deckTop",
              target: { filter: { zone: "trash", controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
            optional: true,
          },
        ],
      })),
      {
        trigger: "AllTurns",
        actions: [
          { kind: "Restrict", restriction: "beSuspended", condition: { kind: "selfHasNoDigivolutionCards" } },
          { kind: "GrantImmunity", immuneFrom: "opponentEffects", condition: { kind: "selfHasNoDigivolutionCards" } },
        ],
      },
    ]);
  });

  // ---------------------------------------------------------------- evolution routes

  it("takes the printed [Digivolve]MoonMillenniummon route for exactly cost 2 and draws 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-075", as: "moon" }],
          hand: [{ card: "BT19-101", as: "zeed" }],
          deck: [{ card: INERT, as: "drawn" }, INERT],
        },
        1: {
          trash: [{ card: "BT19-075", as: "cost" }],
          deck: [{ card: "BT1-010", as: "sentinel" }],
          battleArea: [{ card: INERT, as: "target" }],
          security: [INERT, INERT],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("moon").permanentId,
        instanceId: s.inst("zeed").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT19-101"));

    // Alternate route cost is 2, not the printed Lv6 evoCost of 6 (lane-9 fallback check).
    expect(s.state.memory).toBe(0);
    // Digivolution draw of 1: hand had zeed only, which left the hand for the stack.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(handBefore).toBe(1);
    // Source-stack identity: MoonMillenniummon sits beneath Zeed.
    expect(s.perm("moon").topCard?.instanceId).toBe(s.inst("zeed").instanceId);
    expect(s.perm("moon").stack.map((card) => card.instanceId)).toEqual([s.inst("moon").instanceId]);
    // [When Digivolving]: cost returned the trashed Digimon to the top of their deck, the
    // payload returned their battle-area Digimon to the bottom.
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("cost").instanceId,
      s.inst("sentinel").instanceId,
      s.inst("target").instanceId,
    ]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal source: a real [Millenniummon] peer is not [MoonMillenniummon]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-019", as: "millenniummon" }],
          hand: [{ card: "BT19-101", as: "zeed" }],
          deck: [INERT, INERT],
        },
        1: { deck: [INERT], security: [INERT, INERT] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const memoryBefore = s.state.memory;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("millenniummon").permanentId,
      instanceId: s.inst("zeed").instanceId,
      useAlternateCost: true,
    });

    expect(result.ok).toBe(false);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.perm("millenniummon").topCard?.cardId).toBe("BT18-019");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("zeed").instanceId);
  });

  it("rejects a near-name base for the exact MoonMillenniummon route", () => {
    // No printed card other than BT19-075 contains "MoonMillenniummon", so only a synthetic
    // definition separates `namesExact` from a substring `names` gate.
    const nearName = {
      cardId: "TEST-MOON-VARIANT",
      set: "TEST",
      nameEn: "MoonMillenniummon (Variant)",
      kinds: ["Digimon"],
      colors: ["Black"],
      playCost: 0,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
    } as unknown as CardDefinition;

    expect(matchingAlternateDigivolutionRequirement("BT19-101", nearName)).toBeUndefined();
    expect(
      matchingAlternateDigivolutionRequirement("BT19-101", {
        ...nearName,
        nameEn: "MoonMillenniummon",
      } as unknown as CardDefinition),
    ).toMatchObject({ cost: 2 });
  });

  // ------------------------------------------------- On Play / When Digivolving / When Attacking

  it("resolves the accepted optional On Play return through the public play intent", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-101", as: "zeed" }], deck: [INERT] },
        1: {
          trash: [{ card: "BT19-075", as: "cost" }],
          deck: [{ card: "BT1-010", as: "sentinel" }],
          battleArea: [{ card: INERT, as: "target" }],
          security: [INERT, INERT],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 16;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zeed").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT19-101"));

    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("cost").instanceId,
      s.inst("sentinel").instanceId,
      s.inst("target").instanceId,
    ]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves the accepted optional When Attacking return through a public attack intent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-101", as: "zeed", under: ["BT19-075"] }], deck: [INERT] },
        1: {
          trash: [{ card: "BT19-075", as: "cost" }],
          deck: [{ card: "BT1-010", as: "sentinel" }],
          security: [{ card: INERT, as: "sec1" }, INERT],
          battleArea: [{ card: INERT, as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zeed").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT19-101"));

    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("cost").instanceId,
      s.inst("sentinel").instanceId,
      s.inst("target").instanceId,
    ]);
    // A Zeed WITH digivolution cards suspends normally when it declares an attack.
    expect(s.perm("zeed").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("allows the optional By-return clause to decline without paying or returning", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-101", as: "zeed" }], deck: [INERT] },
        1: {
          trash: [{ card: "BT19-075", as: "cost" }],
          deck: [{ card: "BT1-010", as: "sentinel" }],
          battleArea: [{ card: INERT, as: "target" }],
          security: [INERT, INERT],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 16;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zeed").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT19-101"));

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("sentinel").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("never prompts when the opponent has no Digimon to return from the battle area", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-101", as: "zeed" }], deck: [INERT] },
        1: {
          trash: [{ card: "BT19-075", as: "cost" }],
          deck: [{ card: "BT1-010", as: "sentinel" }],
          security: [INERT, INERT],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 16;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zeed").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT19-101"));

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("sentinel").instanceId]);
  });

  // ------------------------------------------------------- [All Turns] with no digivolution cards

  it("refuses a normal attack by a Zeed with no digivolution cards (can't be suspended)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-101", as: "zeed" }], deck: [INERT] },
      1: { deck: [INERT], security: [INERT, INERT] },
    });
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("zeed"), "beSuspended")).toBe(true);
    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("zeed").permanentId,
      target: { kind: "player" },
    });

    expect(result.ok).toBe(false);
    expect(s.perm("zeed").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  // Q3185: the [All Turns] "can't be suspended" clause does not stop <Overclock>, because
  // Overclock attacks WITHOUT suspending.
  it("Q3185: Overclock still attacks a player at end of turn while unsuspendable", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-101", as: "zeed" }],
          battleArea: [{ card: "BT19-070", as: "composite" }],
          deck: [INERT, INERT],
        },
        1: {
          deck: [INERT],
          security: [
            { card: INERT, as: "sec1" },
            { card: INERT, as: "sec2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 16;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zeed").instanceId })).toEqual({ ok: true });
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT19-070"));

    // Overclock's cost: the other [Composite] trait Digimon is deleted.
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("composite").instanceId)).toBe(true);
    const zeed = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-101");
    expect(zeed).toBeDefined();
    // Attacked a player without suspending, and one security card was checked.
    expect(zeed!.isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("keeps a no-source Zeed unaffected by an opponent's Suspend effect on their real turn", async () => {
    // The suspension must be read INSIDE the opponent's turn: seat 0's next unsuspend phase
    // would stand any suspended permanent back up and make the assertion vacuous.
    let suspendedAtResolve: boolean | undefined;
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-101", as: "zeed" }], hand: [INERT], deck: [INERT, INERT] },
        1: {
          hand: [{ card: "BT1-070", as: "kuwagamon" }],
          deck: [INERT, INERT],
          security: [INERT, INERT],
        },
      },
      {
        autoSelectCards: true,
        autoAcceptOptional: true,
        onEvent: (event) => {
          if (event.kind === "effectResolved" && event.sourceCardId === "BT1-070") {
            suspendedAtResolve = s.state.players[0]!.battleArea[0]?.isSuspended;
          }
        },
      },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("kuwagamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-070"));

    expect(suspendedAtResolve).toBe(false);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("zeed"), "beAffected", "Digimon")).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Control run for the protection above (protections apply where the effect lands, not at
  // targeting): the same Suspend effect DOES suspend an unprotected peer.
  it("control: the same opponent Suspend effect suspends an unprotected peer", async () => {
    let suspendedAtResolve: boolean | undefined;
    const s = setupEngine(
      {
        0: { battleArea: [{ card: INERT, as: "peer" }], hand: [INERT], deck: [INERT, INERT] },
        1: {
          hand: [{ card: "BT1-070", as: "kuwagamon" }],
          deck: [INERT, INERT],
          security: [INERT, INERT],
        },
      },
      {
        autoSelectCards: true,
        autoAcceptOptional: true,
        onEvent: (event) => {
          if (event.kind === "effectResolved" && event.sourceCardId === "BT1-070") {
            suspendedAtResolve = s.state.players[0]!.battleArea[0]?.isSuspended;
          }
        },
      },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("kuwagamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-070"));

    expect(suspendedAtResolve).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Stack case: with a digivolution card underneath, neither [All Turns] clause applies.
  it("drops both [All Turns] clauses once Zeed has a digivolution card", async () => {
    let suspendedAtResolve: boolean | undefined;
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-101", as: "zeed", under: ["BT19-075"] }],
          hand: [INERT],
          deck: [INERT, INERT],
        },
        1: {
          hand: [{ card: "BT1-070", as: "kuwagamon" }],
          deck: [INERT, INERT],
          security: [INERT, INERT],
        },
      },
      {
        autoSelectCards: true,
        autoAcceptOptional: true,
        onEvent: (event) => {
          if (event.kind === "effectResolved" && event.sourceCardId === "BT1-070") {
            suspendedAtResolve = s.state.players[0]!.battleArea[0]?.isSuspended;
          }
        },
      },
    );
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("zeed"), "beSuspended")).toBe(false);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("kuwagamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-070"));

    expect(suspendedAtResolve).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("zeed"), "beAffected", "Digimon")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
