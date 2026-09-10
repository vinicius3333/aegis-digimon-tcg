import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-019.js";
import "./EX2-019.js";
import "./EX2-023.js";
import "../BT4/BT4-104.js";
import "../BT1/BT1-102.js";
import "../index.js";

const inertSecurity = ["BT1-009", "BT1-010"];

describe("EX2-019 Renamon", () => {
  it("matches the catalog and compiled IR for both printed clauses", () => {
    expect(getCardDefinition("EX2-019")).toMatchObject({
      cardId: "EX2-019",
      nameEn: "Renamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Beastkin"],
      effectText:
        "[On Play] Reveal the top 4 cards of your deck. Add 1 card with [Kyubimon], [Taomon], or [Sakuyamon] in its name and 1 [Rika Nonaka] among them to your hand. Place the remaining cards at the bottom of your deck in any order.",
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When you use an Option card with a cost of 2 or more, gain 1 memory.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 4,
              rest: "deckBottom",
              add: [
                { count: 1, to: "hand", filter: { nameOrTrait: expect.any(Array) } },
                { count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["Rika Nonaka"], match: "name" }] } },
              ],
            },
          ],
        },
        {
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenOptionUsed",
              fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
              actions: [{ kind: "GainMemory", amount: 1 }],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("reveals four and adds a named evolution and Rika", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-019", as: "renamon" }],
          deck: [
            { card: "EX2-021", as: "kyubimon" },
            { card: "EX2-060", as: "rika" },
            "EX2-014",
            "EX2-015",
            "EX2-031",
            "EX2-032",
          ],
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.cardId).join(",") === "EX2-031,EX2-032,EX2-014,EX2-015",
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("kyubimon").instanceId, s.inst("rika").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX2-031", "EX2-032", "EX2-014", "EX2-015"]);
  });

  it("gains memory only for a cost-2 Option, then only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-023", as: "host", under: ["EX2-019"] }],
          hand: [
            { card: "BT4-104", as: "cheap" },
            { card: "BT1-102", as: "option1" },
            { card: "BT1-102", as: "option2" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheap").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT4-104"));
    expect(s.state.memory).toBe(7);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 1);
    expect(s.state.memory).toBe(6);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    expect(s.state.memory).toBe(4);
  });

  it("resets the inherited once-per-turn gate on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-023", as: "host", under: ["EX2-019"] }],
          hand: [
            { card: "BT1-102", as: "option1" },
            { card: "BT1-102", as: "option2" },
            { card: "BT1-102", as: "option3" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: inertSecurity,
        },
        1: { deck: ["BT1-009", "BT1-010"], security: inertSecurity },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 1);
    expect(s.state.memory).toBe(9);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    expect(s.state.memory).toBe(7);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    // Passing the turn hands the shared memory gauge to the next player, so the
    // absolute marker is reset by the turn loop. Assert this Option's exact net
    // delta instead of coupling the proof to that turn-start gauge value.
    const nextTurnBefore = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option3").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 3);
    expect(s.state.memory).toBe(nextTurnBefore - 1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("supports legal yellow level-2 evolution from the breeding area with paid play context", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "EX2-003", as: "viximon" }],
          hand: [{ card: "EX2-019", as: "renamon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: inertSecurity,
        },
        1: { deck: ["BT1-012"], security: inertSecurity },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 5;
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX2-003");
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("renamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX2-019");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["EX2-003"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.deck).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects evolution from a non-yellow source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-013", as: "blueSource" }], hand: [{ card: "EX2-019", as: "renamon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueSource").permanentId,
        instanceId: s.inst("renamon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });
});
