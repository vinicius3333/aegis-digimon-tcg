import { getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-037.js";

interface SelectionPayload {
  candidateInstanceIds?: string[];
  visibleInstanceIds?: string[];
  visibleCards?: { instanceId: string; cardId: string }[];
  min?: number;
  max?: number;
  timing?: string;
  effectText?: string;
  orderDestination?: string;
}

function payload(s: EngineSetup): SelectionPayload {
  return s.decisions.at(-1)!.req.options as SelectionPayload;
}

function respond(s: EngineSetup, response: DecisionResponse): void {
  const request = s.decisions.at(-1)!.req;
  expect(
    s.engine.applyIntent(request.seat, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

describe("EX3-037 Dracomon", () => {
  it("has the official metadata and all printed evolution routes", async () => {
    expect(getCardDefinition("EX3-037")).toMatchObject({
      cardId: "EX3-037",
      nameEn: "Dracomon",
      colors: ["Green", "Blue"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [
        { color: "Green", level: 2, memoryCost: 1 },
        { color: "Blue", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Dragon"],
      rarity: "U",
    });

    async function evolve({
      baseCard,
      useAlternateCost,
      expectedMemory,
    }: {
      baseCard: string;
      useAlternateCost?: boolean;
      expectedMemory: number;
    }) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: "EX3-037", as: "dracomon" }],
          deck: ["BT1-010"],
        },
      });
      s.state.memory = 1;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("dracomon").instanceId,
          ...(useAlternateCost === true ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX3-037");
      expect(s.state.memory).toBe(expectedMemory);
    }

    await evolve({ baseCard: "BT1-007", expectedMemory: 0 });
    await evolve({ baseCard: "BT1-003", expectedMemory: 0 });
    await evolve({ baseCard: "EX3-001", useAlternateCost: true, expectedMemory: 1 });
  });

  it("publishes exact reveal candidates and visibility, never reusing a selected card, and honors bottom order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-037", as: "dracomon" }],
          deck: [
            { card: "EX3-039", as: "greenDramon" },
            { card: "EX3-020", as: "blueDramon" },
            { card: "EX3-074", as: "examon" },
            { card: "BT1-010", as: "filler" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dracomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const allRevealed = ["greenDramon", "blueDramon", "examon", "filler"].map((alias) => s.inst(alias).instanceId);
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-037",
      options: {
        candidateInstanceIds: expect.arrayContaining([
          s.inst("greenDramon").instanceId,
          s.inst("blueDramon").instanceId,
        ]),
        visibleInstanceIds: allRevealed,
        visibleCards: expect.arrayContaining(allRevealed.map((instanceId) => expect.objectContaining({ instanceId }))),
        timing: "OnPlay",
        min: 1,
        max: 1,
      },
    });
    expect(payload(s).candidateInstanceIds).toHaveLength(2);
    respond(s, { kind: "selectCards", instanceIds: [s.inst("greenDramon").instanceId] });

    await settle(() => s.state.pendingDecision?.kind === "selectCards" && s.decisions.length >= 2);
    expect(payload(s)).toMatchObject({
      candidateInstanceIds: [s.inst("examon").instanceId],
      visibleInstanceIds: allRevealed,
      timing: "OnPlay",
      min: 1,
      max: 1,
    });
    expect(payload(s).candidateInstanceIds).not.toContain(s.inst("greenDramon").instanceId);
    respond(s, { kind: "selectCards", instanceIds: [s.inst("examon").instanceId] });

    await settle(() => s.state.pendingDecision?.kind === "orderCards" && s.decisions.at(-1)?.req.kind === "orderCards");
    const requestedOrder = [s.inst("filler").instanceId, s.inst("blueDramon").instanceId];
    expect(payload(s)).toMatchObject({
      candidateInstanceIds: expect.arrayContaining(requestedOrder),
      visibleInstanceIds: expect.arrayContaining(requestedOrder),
      orderDestination: "deckBottom",
    });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("greenDramon").instanceId, s.inst("examon").instanceId]),
    );
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(
      s.events.some(
        (event) =>
          event.kind === "cardsMoved" &&
          event.to === "hand" &&
          event.instanceIds.some((instanceId) => requestedOrder.includes(instanceId)),
      ),
    ).toBe(false);
    expect(observe(s.engine).subscriptions("whenSuspended")).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "orderCards", order: requestedOrder },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.events.some(
          (event) =>
            event.kind === "cardsMoved" &&
            event.to === "deck" &&
            event.instanceIds.some((instanceId) => requestedOrder.includes(instanceId)),
        ),
    );

    expect(
      s.events.find(
        (event) =>
          event.kind === "cardsMoved" &&
          event.to === "deck" &&
          event.instanceIds.some((instanceId) => requestedOrder.includes(instanceId)),
      ),
    ).toMatchObject({ instanceIds: requestedOrder });
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(requestedOrder);
  });

  it("Q3413/Q3414: adds every available mandatory Dramon and Examon category", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-037", as: "dracomon" }],
          deck: [
            { card: "EX3-039", as: "blueDramon" },
            { card: "EX3-074", as: "examon" },
            { card: "BT1-025", as: "redDramon" },
            { card: "BT1-010", as: "unrelated" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("blueDramon").instanceId, s.inst("examon").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dracomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2 && s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("blueDramon").instanceId, s.inst("examon").instanceId]),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("redDramon").instanceId, s.inst("unrelated").instanceId]),
    );
    const choices = s.decisions.filter(({ req }) => req.sourceCardId === "EX3-037" && req.kind === "selectCards");
    expect(choices).toHaveLength(2);
    expect(choices.map(({ req }) => [req.options?.min, req.options?.max])).toEqual([
      [1, 1],
      [1, 1],
    ]);
  });

  it("Q3413 adds the sole available category and bottoms all other revealed cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-037", as: "dracomon" }],
          deck: [
            { card: "EX3-039", as: "blueDramon" },
            { card: "BT1-010", as: "filler1" },
            { card: "BT1-011", as: "filler2" },
            { card: "BT1-012", as: "filler3" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("blueDramon").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dracomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("blueDramon").instanceId) &&
        s.state.players[0]!.deck.length === 3 &&
        s.state.pendingDecision === undefined &&
        s.decisions.some(({ req }) => req.sourceCardId === "EX3-037" && req.kind === "orderCards"),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("blueDramon").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-037" && req.kind === "selectCards")).toHaveLength(
      1,
    );
    const order = s.decisions.find(({ req }) => req.sourceCardId === "EX3-037" && req.kind === "orderCards")!.req;
    expect(order.options?.orderDestination).toBe("deckBottom");
    expect(order.options?.candidateInstanceIds).toHaveLength(3);
  });

  it("adds nothing and still orders all 4 cards when no category is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-037", as: "dracomon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dracomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 4 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-037" && req.kind === "selectCards")).toHaveLength(
      0,
    );
  });

  it("reveals only the available cards when the deck has fewer than 4", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-037", as: "dracomon" }],
          deck: [
            { card: "EX3-039", as: "eligible" },
            { card: "BT1-010", as: "filler" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eligible").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dracomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("eligible").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("eligible").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("filler").instanceId]);
    expect(s.decisions.at(-1)?.req.options?.visibleInstanceIds).toHaveLength(2);
  });

  it("uses the alternate 0-cost digivolution from Bebydomon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-001", as: "bebydomon" }],
        hand: [{ card: "EX3-037", as: "dracomon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bebydomon").permanentId,
        instanceId: s.inst("dracomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bebydomon").topCard.cardId === "EX3-037");

    expect(s.state.memory).toBe(0);
    expect(s.perm("bebydomon").stack.map(({ cardId }) => cardId)).toContain("EX3-001");
  });

  it("Dramon/Examon inherited family: buffs only its host once per turn when an ally suspends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-038", under: [{ card: "EX3-037" }], dp: 5000, as: "host" },
          { card: "EX3-039", dp: 5000, as: "firstDramon" },
          { card: "EX3-074", dp: 15000, as: "examon" },
          { card: "BT1-010", dp: 5000, as: "unrelated" },
        ],
      },
      1: { battleArea: [{ card: "EX3-039", dp: 5000, as: "opponentDramon" }] },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("firstDramon").permanentId]);
    await settle(() => s.perm("host").currentDP === 6000);
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.perm("firstDramon").currentDP).toBe(5000);

    await advance(s.engine).verb.suspend([s.perm("examon").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("unrelated").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("opponentDramon").permanentId]);
    await settle();
    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("triggers its inherited effect when an allied Dramon suspends to attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-038", under: [{ card: "EX3-037" }], dp: 5000, as: "host" },
          { card: "EX3-039", as: "attacker" },
        ],
      },
      1: { security: ["BT1-003"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 6000);

    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("arms two inherited copies independently without duplicate subscriptions and enforces OPT per copy", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-038", under: [{ card: "EX3-037" }], dp: 5000, as: "firstHost" },
          { card: "EX3-038", under: [{ card: "EX3-037" }], dp: 7000, as: "secondHost" },
          { card: "EX3-039", as: "firstAlly" },
          { card: "EX3-074", as: "secondAlly" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).recompute();
    await advance(s.engine).recompute();

    await advance(s.engine).verb.suspend([s.perm("firstAlly").permanentId]);
    await settle(() => s.perm("firstHost").currentDP === 6000 && s.perm("secondHost").currentDP === 8000);
    await advance(s.engine).verb.suspend([s.perm("secondAlly").permanentId]);
    await settle();

    expect(s.perm("firstHost").currentDP).toBe(6000);
    expect(s.perm("secondHost").currentDP).toBe(8000);
  });

  it("resets the inherited once-per-turn buff and removes the previous turn's DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-038", under: [{ card: "EX3-037" }], dp: 5000, as: "host" },
          { card: "EX3-039", dp: 5000, as: "firstDramon" },
          { card: "EX3-074", dp: 15000, as: "examon" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
      1: { deck: ["BT1-003", "BT1-004"] },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("firstDramon").permanentId]);
    await settle(() => s.perm("host").currentDP === 6000);
    await advance(s.engine).runTurn(0);
    expect(s.perm("host").currentDP).toBe(5000);

    s.perm("examon").isSuspended = false;
    await advance(s.engine).verb.suspend([s.perm("examon").permanentId]);
    await settle(() => s.perm("host").currentDP === 6000);
    expect(s.perm("host").currentDP).toBe(6000);
  });
});
