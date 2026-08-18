import { getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./EX3-028.js";

function payload(decision: { payloadJson: string }): {
  candidateInstanceIds?: string[];
  visibleInstanceIds?: string[];
  visibleCards?: { instanceId: string; cardId: string }[];
  timing?: string;
  effectText?: string;
  min?: number;
  max?: number;
  orderDestination?: string;
} {
  return JSON.parse(decision.payloadJson) as {
    candidateInstanceIds?: string[];
    visibleInstanceIds?: string[];
    visibleCards?: { instanceId: string; cardId: string }[];
    timing?: string;
    effectText?: string;
    min?: number;
    max?: number;
    orderDestination?: string;
  };
}

function respond(s: EngineSetup, response: DecisionResponse): void {
  const decision = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(decision.seat, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

describe("EX3-028 Patamon", () => {
  it("has the official errata identity and digivolves from a yellow level 2 for 0", async () => {
    const definition = getCardDefinition("EX3-028")!;
    expect(definition).toMatchObject({
      cardId: "EX3-028",
      nameEn: "Patamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Mammal"],
      rarity: "C",
      imageId: "EX3-028-Errata",
    });
    expect(definition.effectText).toContain("[Angel], [Cherub], [Throne], [Authority], [Seraph] or [Virtue]");
    expect(definition.effectText).toContain("other than [Three Great Angels]");
    expect(definition.inheritedEffectText).toBeUndefined();

    const s = setupEngine({
      0: {
        breeding: { card: "BT1-005", as: "base" },
        hand: [{ card: "EX3-028", as: "patamon" }],
        deck: ["BT1-001"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("patamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-028");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");
  });

  it("Four Great Dragons/Angel family: forces both independent adds, exposes the full reveal, and orders the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-028", as: "patamon" }],
          deck: [
            { card: "BT1-062", as: "authority" },
            { card: "BT1-063", as: "excludedThreeGreatAngels" },
            { card: "EX3-025", as: "fourGreatDragon" },
            { card: "BT1-029", as: "filler" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const angelChoice = s.state.pendingDecision!;
    const angelPayload = payload(angelChoice);
    const revealed = ["authority", "excludedThreeGreatAngels", "fourGreatDragon", "filler"].map(
      (alias) => s.inst(alias).instanceId,
    );
    expect(angelChoice.seat).toBe(0);
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-028",
      options: {
        timing: "OnPlay",
        effectText: expect.stringContaining("other than [Three Great Angels]"),
        candidateInstanceIds: [s.inst("authority").instanceId],
        visibleInstanceIds: expect.arrayContaining(revealed),
        visibleCards: expect.arrayContaining(revealed.map((instanceId) => expect.objectContaining({ instanceId }))),
        min: 1,
        max: 1,
      },
    });
    expect(angelPayload.candidateInstanceIds).toEqual([s.inst("authority").instanceId]);
    expect(angelPayload.visibleInstanceIds).toEqual(expect.arrayContaining(revealed));
    expect(angelPayload.visibleInstanceIds).toHaveLength(4);
    expect(angelPayload.visibleCards).toHaveLength(4);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: angelChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: angelChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("authority").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const dragonChoice = s.state.pendingDecision!;
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-028",
      options: {
        timing: "OnPlay",
        effectText: expect.stringContaining("[Four Great Dragons]"),
        candidateInstanceIds: [s.inst("fourGreatDragon").instanceId],
        visibleInstanceIds: expect.arrayContaining(revealed),
        min: 1,
        max: 1,
      },
    });
    expect(payload(dragonChoice).candidateInstanceIds).toEqual([s.inst("fourGreatDragon").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dragonChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dragonChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("fourGreatDragon").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = s.state.pendingDecision!;
    const requestedBottomOrder = [s.inst("filler").instanceId, s.inst("excludedThreeGreatAngels").instanceId];
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "orderCards",
      sourceCardId: "EX3-028",
      options: {
        timing: "OnPlay",
        effectText: expect.stringContaining("bottom of your deck in any order"),
        candidateInstanceIds: expect.arrayContaining(requestedBottomOrder),
        visibleInstanceIds: expect.arrayContaining(requestedBottomOrder),
        orderDestination: "deckBottom",
        min: 2,
        max: 2,
      },
    });
    expect(payload(order).candidateInstanceIds).toEqual(expect.arrayContaining(requestedBottomOrder));
    expect(payload(order).candidateInstanceIds).toHaveLength(2);
    expect(payload(order).visibleInstanceIds).toEqual(expect.arrayContaining(requestedBottomOrder));
    expect(payload(order).visibleInstanceIds).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: {
          kind: "orderCards",
          order: requestedBottomOrder,
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.events.some(
          (event) =>
            event.kind === "cardsMoved" &&
            event.to === "deck" &&
            event.instanceIds.length === 2 &&
            event.instanceIds.every((instanceId, index) => instanceId === requestedBottomOrder[index]),
        ),
    );

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-062", "EX3-025"]),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(requestedBottomOrder);
    expect(s.state.memory).toBe(0);
  });

  it.each([
    ["Angel", "BT1-053"],
    ["Throne", "BT4-047"],
    ["Authority", "BT1-062"],
    ["Seraph", "EX4-050"],
    ["Virtue", "BT3-042"],
  ])("Q3403 adds the sole eligible yellow %s card even without a Four Great Dragon", async (_trait, cardId) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-028", as: "patamon" }],
          deck: [{ card: cardId, as: "eligible" }, "BT1-029", "BT1-030", "BT1-031"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eligible").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("eligible").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("eligible").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("handles a short 3-card deck by making both adds mandatory and returning the sole remainder", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX3-028", as: "patamon" }],
        deck: [
          { card: "BT1-062", as: "authority" },
          { card: "EX3-025", as: "dragon" },
          { card: "BT1-029", as: "remainder" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const visibleCards = [
      { instanceId: s.inst("authority").instanceId, cardId: "BT1-062" },
      { instanceId: s.inst("dragon").instanceId, cardId: "EX3-025" },
      { instanceId: s.inst("remainder").instanceId, cardId: "BT1-029" },
    ];
    expect(payload(s.state.pendingDecision!)).toMatchObject({
      candidateInstanceIds: [s.inst("authority").instanceId],
      visibleInstanceIds: visibleCards.map(({ instanceId }) => instanceId),
      visibleCards,
      timing: "OnPlay",
      min: 1,
      max: 1,
    });
    expect(payload(s.state.pendingDecision!).visibleCards).toHaveLength(3);
    respond(s, { kind: "selectCards", instanceIds: [s.inst("authority").instanceId] });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(payload(s.state.pendingDecision!)).toMatchObject({
      candidateInstanceIds: [s.inst("dragon").instanceId],
      visibleInstanceIds: visibleCards.map(({ instanceId }) => instanceId),
      visibleCards,
      timing: "OnPlay",
      min: 1,
      max: 1,
    });
    expect(payload(s.state.pendingDecision!).visibleCards).toHaveLength(3);
    respond(s, { kind: "selectCards", instanceIds: [s.inst("dragon").instanceId] });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-028"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("authority").instanceId, s.inst("dragon").instanceId]),
    );
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("remainder").instanceId]);
    expect(s.decisions.filter(({ req }) => req.kind === "orderCards")).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("Q3403 adds the sole Four Great Dragon even without an eligible yellow angel-family card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-028", as: "patamon" }],
          deck: [{ card: "EX3-025", as: "dragon" }, "BT1-029", "BT1-030", "BT1-031"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("dragon").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("dragon").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("dragon").instanceId]);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("rejects non-yellow Cherub and yellow Three Great Angels while still returning every revealed card", async () => {
    // The catalog currently has no yellow Cherub outside [Three Great Angels]. These
    // two real cards prove both live boundaries: Cherub without yellow fails the color
    // gate, while yellow Cherub is explicitly excluded by the errata.
    expect(getCardDefinition("ST17-09")).toMatchObject({ colors: ["Green", "Purple"], types: ["Cherub"] });
    expect(getCardDefinition("BT3-041")?.types).toEqual(expect.arrayContaining(["Cherub", "Three Great Angels"]));
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-028", as: "patamon" }],
          deck: ["ST17-09", "BT3-041", "BT1-029"],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(0);
    const order = ["BT1-029", "ST17-09", "BT3-041"].map(
      (cardId) => s.state.players[0]!.deck.find(({ cardId: current }) => current === cardId)!.instanceId,
    );
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "orderCards",
      sourceCardId: "EX3-028",
      options: {
        timing: "OnPlay",
        effectText: expect.stringContaining("bottom of your deck in any order"),
        candidateInstanceIds: expect.arrayContaining(order),
        visibleInstanceIds: expect.arrayContaining(order),
        orderDestination: "deckBottom",
        min: 3,
        max: 3,
      },
    });
    expect(payload(s.state.pendingDecision!).candidateInstanceIds).toHaveLength(3);
    expect(payload(s.state.pendingDecision!).visibleInstanceIds).toHaveLength(3);
    respond(s, { kind: "orderCards", order });
    await settle(() =>
      s.events.some(
        (event) =>
          event.kind === "cardsMoved" &&
          event.to === "deck" &&
          event.instanceIds.length === 3 &&
          event.instanceIds.every((instanceId, index) => instanceId === order[index]),
      ),
    );

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(order);
  });
});
