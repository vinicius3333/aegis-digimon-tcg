import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-011.js";

describe("EX1-011 Gabumon", () => {
  it("reveals exactly three and adds one Tamer or Gabumon, not both (Q3201)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-032", as: "attacker", under: ["EX1-011"] }],
          deck: ["ST2-12", "BT2-069", "BT1-030", "BT1-031"],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "ST2-12"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["ST2-12"]);
    expect(s.events.filter((event) => event.kind === "cardRevealed").map((event) => event.cardId)).toEqual([
      "ST2-12",
      "BT2-069",
      "BT1-030",
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT2-069", "BT1-030", "BT1-031"]),
    );
  });

  it.each([
    ["non-blue Gabumon", "BT2-069"],
    ["non-blue Tamer", "ST3-12"],
  ])("adds a %s as permitted by Q3202", async (_label, candidate) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-032", as: "attacker", under: ["EX1-011"] }],
          deck: [candidate, "BT1-030", "BT1-031"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand[0]!.cardId).toBe(candidate);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("does not match a near-name Garurumon or other non-Tamer card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-032", as: "attacker", under: ["EX1-011"] }],
          deck: ["BT2-073", "BT1-030", "BT1-031"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT2-073", "BT1-030", "BT1-031"]);
  });

  it("returns all non-matches to the deck bottom in the chosen order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-032", as: "attacker", under: ["EX1-011"] }],
          deck: [
            { card: "BT1-030", as: "first" },
            { card: "BT1-031", as: "second" },
            { card: "BT1-033", as: "third" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const decision = s.decisions.at(-1)!.req;
    const chosenOrder = [s.inst("third").instanceId, s.inst("first").instanceId, s.inst("second").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "orderCards", order: chosenOrder },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(chosenOrder);
  });

  it("does not fire when EX1-011 is not an inherited source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-011", as: "attacker" }], deck: ["ST2-12", "BT1-030", "BT1-031"] },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["ST2-12", "BT1-030", "BT1-031"]);
  });

  it("resets the inherited once-per-turn limit on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-032", as: "attacker", under: ["EX1-011"] }],
          hand: [{ card: "BT1-036", as: "unsuspender" }],
          deck: ["ST2-12", "BT1-030", "BT1-031", "ST3-12", "BT1-033", "BT1-034"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    s.state.memory = 10;

    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "ST2-12"));
    expect(s.state.players[0]!.deck).toHaveLength(5);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("attacker").isSuspended);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.deck).toHaveLength(5);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "ST3-12"));
    expect(s.state.players[0]!.deck).toHaveLength(4);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the source identity in a legal EX1-011 evolution stack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "egg" },
        hand: [{ card: "EX1-011", as: "evo" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        security: ["BT1-009"],
      },
    });
    s.state.memory = 0;
    await s.ready();
    const eggId = s.inst("egg").instanceId;
    const breedingId = s.perm("egg").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX1-011");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.instanceId)).toEqual([eggId]);
    expect(s.state.memory).toBe(0);
  });
});
