import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-101 ZeedMillenniummon", () => {
  it("preserves Overclock, trash-to-top cost, conditional immunity, and alternate evolution", () => {
    const card = runtimeCompiledCard("BT19-101");

    expect(card).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["MoonMillenniummon"], cost: 2, isAlternate: true }],
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
            abortOnDecline: true,
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

  it("resolves the mandatory On Play return through the public play intent", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-101", as: "zeed" }] },
        1: {
          trash: [{ card: "BT19-075", as: "cost" }],
          deck: [{ card: "BT1-010", as: "sentinel" }],
          battleArea: [{ card: "BT1-009", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 16;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zeed").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT19-101"));

    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT19-075", "BT1-010"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("resolves the mandatory When Digivolving return through the alternate evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-075", as: "moon" }],
          hand: [{ card: "BT19-101", as: "zeed" }],
        },
        1: {
          trash: [{ card: "BT19-075", as: "cost" }],
          deck: [{ card: "BT1-010", as: "sentinel" }],
          battleArea: [{ card: "BT1-009", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("moon").permanentId,
        instanceId: s.inst("zeed").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT19-101"));

    expect(s.perm("moon").stack.map((card) => card.cardId)).toEqual(["BT19-075"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT19-075", "BT1-010"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("resolves the mandatory When Attacking return through a public attack intent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-101", as: "zeed", under: ["BT19-075"] }] },
        1: {
          trash: [{ card: "BT19-075", as: "cost" }],
          deck: [{ card: "BT1-010", as: "sentinel" }],
          security: ["BT1-001"],
          battleArea: [{ card: "BT1-009", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zeed").permanentId,
        target: { kind: "player", seat: 1 },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT19-101"));

    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT19-075", "BT1-010"]);
    expect(s.perm("zeed").isSuspended).toBe(true);
  });

  it("keeps a no-source Zeed unsuspendable and immune to a natural opponent Suspend effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-101", as: "zeed" }] },
        1: { hand: ["BT1-070"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 4;
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("zeed"), "beSuspended")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.state.players[1]!.hand[0]!.instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-070"));

    expect(s.perm("zeed").isSuspended).toBe(false);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("zeed"), "beAffected", "Digimon")).toBe(true);
  });

  it("allows the optional By-return clause to decline without paying or deleting", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-101", as: "zeed" }] },
        1: {
          trash: [{ card: "BT19-075", as: "cost" }],
          deck: [{ card: "BT1-010", as: "sentinel" }],
          battleArea: [{ card: "BT1-009", as: "target" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 16;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zeed").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT19-101"));

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT19-075"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("aborts the optional processing condition before prompting when no return target exists", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-101", as: "zeed" }] },
        1: {
          trash: [{ card: "BT19-075", as: "cost" }],
          deck: [{ card: "BT1-010", as: "sentinel" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 16;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zeed").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT19-101"));

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT19-075"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });

});
