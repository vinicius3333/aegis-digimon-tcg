import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-078.js";
import "../BT10/BT10-056.js";

describe("BT1-078 Jagamon", () => {
  it("evolves from a green level 4 and keeps the source beneath Jagamon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-074", as: "base" }],
        hand: [{ card: "BT1-078", as: "jagamon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jagamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("jagamon").instanceId);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-074"]);
    expect(s.state.memory).toBe(0);
  });

  it("reveals 3 cards and may digivolve into a revealed level 6 green Digimon for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-078", as: "attacker" }],
          deck: [{ card: "BT1-081", as: "evolution" }, "BT1-010", "BT1-011", { card: "BT1-012", as: "drawn" }],
        },
        1: { security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("attacker").topCard.instanceId === s.inst("evolution").instanceId &&
        s.state.players[0]!.deck.length === 2 &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId) &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-078"),
    );
    expect(s.perm("attacker").topCard.cardId).toBe("BT1-081");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("may decline the revealed evolution and bottoms every revealed card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-078", as: "attacker" }],
        deck: [
          { card: "BT1-081", as: "evolution" },
          { card: "BT1-010", as: "missA" },
          { card: "BT1-011", as: "missB" },
        ],
      },
      1: { security: ["BT1-012"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decline = s.decisions.at(-1)!.req;
    expect(decline.options).toMatchObject({ min: 0, max: 1 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decline.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);

    expect(s.perm("attacker").topCard.cardId).toBe("BT1-078");
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("evolution").instanceId, s.inst("missA").instanceId, s.inst("missB").instanceId]),
    );
  });

  it("orders the remaining cards before opening the new Digimon's When Digivolving window (Q932)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-078", as: "attacker" }],
          deck: [
            { card: "BT10-056", as: "evolution" },
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-016", as: "target" }],
          security: ["BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    expect(s.perm("attacker").topCard.instanceId).toBe(s.inst("evolution").instanceId);
    expect(s.perm("target").isSuspended).toBe(false);
    const decision = s.decisions.at(-1)!.req;
    const order = [s.inst("second").instanceId, s.inst("first").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "orderCards", order },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(order);
  });

  it("reveals as many cards as possible with fewer than 3 cards (Q933)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-078", as: "attacker" }],
          deck: [
            { card: "BT1-081", as: "evolution" },
            { card: "BT1-010", as: "rest" },
          ],
        },
        1: { security: ["BT1-012"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("attacker").topCard.instanceId === s.inst("evolution").instanceId &&
        s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("rest").instanceId) &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-078"),
    );

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });
});
