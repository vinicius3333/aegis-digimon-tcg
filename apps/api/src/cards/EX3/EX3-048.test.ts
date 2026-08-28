import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-047.js";
import "./EX3-048.js";
import "./EX3-049.js";
import "./EX3-052.js";
import "./EX3-065.js";

interface DecisionPayload {
  candidateInstanceIds?: string[];
  visibleInstanceIds?: string[];
  min?: number;
  max?: number;
  orderDestination?: string;
}

function payload(decision: { payloadJson: string }): DecisionPayload {
  return JSON.parse(decision.payloadJson) as DecisionPayload;
}

describe("EX3-048 Jazardmon", () => {
  it.each([
    ["black", "EX3-046"],
    ["red", "EX3-005"],
  ])("has the official metadata and digivolves from a %s level 3 for 2", async (_color, baseCardId) => {
    expect(getCardDefinition("EX3-048")).toMatchObject({
      cardId: "EX3-048",
      nameEn: "Jazardmon",
      colors: ["Black"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 2 },
        { color: "Red", level: 3, memoryCost: 2 },
      ],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Machine Dragon"],
      rarity: "U",
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCardId, as: "base" }],
        hand: [{ card: "EX3-048", as: "jazardmon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jazardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-048");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("EX3-048");
  });

  it("Q3417/Q3418 forces one Dragon and one Hina, exposes all 4 cards, and preserves chosen bottom order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-048", as: "jazardmon" }],
          deck: [
            { card: "EX3-047", as: "birdDragon" },
            { card: "EX3-065", as: "hina" },
            { card: "BT1-010", as: "firstFiller" },
            { card: "BT1-011", as: "secondFiller" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jazardmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const dragonChoice = s.state.pendingDecision!;
    expect(payload(dragonChoice)).toMatchObject({
      candidateInstanceIds: [s.inst("birdDragon").instanceId],
      visibleInstanceIds: expect.arrayContaining([
        s.inst("birdDragon").instanceId,
        s.inst("hina").instanceId,
        s.inst("firstFiller").instanceId,
        s.inst("secondFiller").instanceId,
      ]),
      min: 1,
      max: 1,
    });
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
        response: { kind: "selectCards", instanceIds: [s.inst("birdDragon").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const hinaChoice = s.state.pendingDecision!;
    expect(payload(hinaChoice)).toMatchObject({
      candidateInstanceIds: [s.inst("hina").instanceId],
      visibleInstanceIds: expect.arrayContaining([
        s.inst("birdDragon").instanceId,
        s.inst("hina").instanceId,
        s.inst("firstFiller").instanceId,
        s.inst("secondFiller").instanceId,
      ]),
      min: 1,
      max: 1,
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: hinaChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("hina").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = s.state.pendingDecision!;
    expect(payload(order)).toMatchObject({
      candidateInstanceIds: expect.arrayContaining([
        s.inst("firstFiller").instanceId,
        s.inst("secondFiller").instanceId,
      ]),
      orderDestination: "deckBottom",
    });
    const requestedOrder = [s.inst("secondFiller").instanceId, s.inst("firstFiller").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderCards", order: requestedOrder },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map(({ instanceId }) => instanceId).join(",") === requestedOrder.join(","),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("birdDragon").instanceId, s.inst("hina").instanceId]),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(requestedOrder);
  });

  it("Q3417 adds the sole Hina category and bottoms every other revealed card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-048", as: "jazardmon" }],
          deck: [{ card: "EX3-065", as: "hina" }, "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("hina").instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jazardmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("hina").instanceId));

    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("adds nothing and orders all revealed cards when neither category exists", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-048", as: "jazardmon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoOrderCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jazardmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderCards"));

    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it.each([
    ["Rock Dragon", "EX3-005"],
    ["Earth Dragon", "EX3-012"],
    ["Bird Dragon", "EX3-047"],
    ["Machine Dragon", "EX3-044"],
    ["Sky Dragon", "EX3-053"],
  ])("recognizes the %s trait as the mandatory Digimon category", async (_trait, cardId) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-048", as: "jazardmon" }],
          deck: [{ card: cardId, as: "eligible" }, "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eligible").instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jazardmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("eligible").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("eligible").instanceId);
  });

  it("Machine/Bird Dragon family: searches Jazamon and Hina, then Hina's play triggers Jazamon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-047", as: "watchingJazamon" }],
          hand: [{ card: "EX3-048", as: "jazardmon" }],
          deck: [{ card: "EX3-047", as: "searchedJazamon" }, { card: "EX3-065", as: "hina" }, "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("searchedJazamon").instanceId, s.inst("hina").instanceId);
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jazardmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("hina").instanceId));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hina").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("searchedJazamon").instanceId,
    );
  });

  it("its inherited effect grants +1000 DP only while the live top card has an On Play effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-052", under: ["EX3-048"], as: "onPlayHost" },
          { card: "EX3-049", under: ["EX3-048"], as: "plainHost" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("onPlayHost").currentDP).toBe(8000);
    expect(s.perm("plainHost").currentDP).toBe(4000);
  });
});
