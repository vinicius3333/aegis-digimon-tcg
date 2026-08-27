import { describe, expect, it } from "vitest";
import { Phase, digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-036.js";
import "../index.js";

describe("BT26-036 Lalamon", () => {
  it("compiles the two printed reveal windows", () => {
    expect(digivolutionRequirementsFor("BT26-036")).toContainEqual({
      level: 2,
      traits: ["DATA SQUAD"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => e.trigger)).toEqual(["OnPlay", "WhenMoving", "WhenAttacking"]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          count: 1,
          to: "hand",
          filter: {
            nameOrTrait: [
              { tokens: ["Vegetation"], match: "trait" },
              { tokens: ["Fairy"], match: "trait" },
              { tokens: ["DATA SQUAD"], match: "trait" },
            ],
          },
          orFilters: [{ kind: ["Tamer"], colors: ["Green"] }],
        },
      ],
      rest: "deckBottom",
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Suspend", optional: true }],
    });
  });

  it.each([
    ["Vegetation", "BT26-034"],
    ["Fairy", "BT1-047"],
    ["DATA SQUAD", "BT26-065"],
  ])("reveals three, adds a %s card, and returns the rest to the bottom", async (_trait, matchingCard) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-036", as: "self" }],
          deck: [{ card: matchingCard, as: "match" }, { card: "BT1-009" }, { card: "BT1-010" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: [] },
    );
    const matchId = s.inst("match").instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === matchId));
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([matchId]);
    expect(s.state.players[0]!.deck.map((c) => c.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("When Moving adds the green Tamer alternative and bottoms the two nonmatches", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT26-036", as: "mover" },
          deck: [
            { card: "BT26-091", as: "greenTamer" },
            { card: "BT1-085", as: "otherTamer" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("greenTamer").instanceId);
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("greenTamer").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("greenTamer").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("otherTamer").instanceId, s.inst("plain").instanceId]),
    );
  });

  it("adds a green Tamer without a matching trait and rejects a non-green Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-036", as: "self" }],
          deck: [
            { card: "BT1-089", as: "greenTamer" },
            { card: "BT1-085", as: "redTamer" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("greenTamer").instanceId));

    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([s.inst("greenTamer").instanceId]);
    expect(s.state.players[0]!.deck.map((c) => c.instanceId)).toEqual([
      s.inst("redTamer").instanceId,
      s.inst("plain").instanceId,
    ]);
  });

  it("inherited When Attacking suspends one opponent Digimon only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-039", as: "host", under: [{ card: "BT26-036" }, { card: "EX4-019" }] },
            { card: "BT1-009", as: "own" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
          hand: Array.from({ length: 8 }, () => "BT1-004"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").isSuspended && !s.perm("host").isSuspended && !observe(s.engine).isAttacking());
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(s.perm("own").isSuspended).toBe(false);
  });

  it("may decline the inherited suspension", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-039", as: "host", under: [{ card: "BT26-036" }] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("opponent").isSuspended).toBe(false);
  });

  it("uses the exact level-2 DATA SQUAD cost-0 evolution and rejects a near-match", () => {
    const legal = setupEngine({
      0: {
        breeding: { card: "BT25-002", as: "dataSquadEgg" },
        hand: [{ card: "BT26-036", as: "lalamon" }],
      },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("dataSquadEgg").permanentId,
        instanceId: legal.inst("lalamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });

    const invalid = setupEngine({
      0: {
        breeding: { card: "BT26-001", as: "plainEgg" },
        hand: [{ card: "BT26-036", as: "lalamon" }],
      },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainEgg").permanentId,
        instanceId: invalid.inst("lalamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
