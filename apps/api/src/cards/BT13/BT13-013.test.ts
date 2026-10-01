import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-013.js";
import "./BT13-014.js";
import "../BT6/BT6-082.js";

describe("BT13-013 BaoHuckmon", () => {
  it("after an allied Sistermon play may digivolve into SaviorHuckmon with its cost reduced by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-013", as: "bao" }],
          hand: [
            { card: "BT6-082", as: "sistermon" },
            { card: "BT13-016", as: "savior" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sistermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("bao").topCard.cardId === "BT13-016");
    await settle();

    expect(s.state.memory).toBe(6);
    expect(s.perm("bao").stack.some((card) => card.cardId === "BT13-013")).toBe(true);
  });

  it("does not gain its newly acquired inherited memory effect for the triggering Sistermon (Q2272)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-013", as: "bao" }],
          hand: [
            { card: "BT6-082", as: "sistermon" },
            { card: "BT13-016", as: "savior" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sistermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("bao").topCard.cardId === "BT13-016");
    await settle();
    expect(s.state.memory).toBe(6);
  });

  it("may decline the Sistermon-triggered SaviorHuckmon digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-013", as: "bao" }],
          hand: [
            { card: "BT6-082", as: "sistermon" },
            { card: "BT13-016", as: "savior" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sistermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();

    expect(s.perm("bao").topCard.cardId).toBe("BT13-013");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("savior").instanceId)).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("does not reduce a normal digivolution that was not initiated by its Sistermon trigger", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-013", as: "bao" }],
        hand: [{ card: "BT13-016", as: "savior" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    const evolutionMaterialId1 = s.perm("bao").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bao").permanentId,
        instanceId: s.inst("savior").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bao").stack.some((card) => card.instanceId === evolutionMaterialId1));
    expect(s.perm("bao").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId1);
    await settle(() => s.perm("bao").topCard.cardId === "BT13-016");
    expect(s.state.memory).toBe(7);
  });

  it("its inherited effect gains memory only once per turn for allied Sistermon plays", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-014", as: "host", under: [{ card: "BT13-013", as: "source" }] }],
        hand: [
          { card: "BT6-082", as: "first" },
          { card: "BT6-082", as: "second" },
          { card: "BT6-082", as: "third" },
        ],
        deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
      },
      1: { hand: ["BT1-010"], deck: ["BT1-010", "BT1-010", "BT1-010"] },
    });
    s.state.memory = 10;
    await s.ready();

    const sourceId = s.inst("source").instanceId;
    s.state.turnSeat = 0;
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();
    expect(s.state.memory).toBe(8);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await settle();
    expect(s.state.memory).toBe(5);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(sourceId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 4);
    await settle();
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(sourceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });
});

describe("BT13-013 BaoHuckmon — KB Q&A rulings", () => {
  async function playSistermonResolvingFirst(firstCardId: string) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-013", as: "bao" }],
          hand: [
            { card: "BT6-082", as: "sistermon" },
            { card: "BT13-016", as: "handSavior" },
          ],
          deck: [{ card: "BT13-016", as: "drawnSavior" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [firstCardId] },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sistermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("bao").topCard.cardId === "BT13-016");
    await settle();

    const orderRequest = s.decisions.find(({ req }) => req.kind === "orderTriggers");
    expect(orderRequest?.seat).toBe(0);
    expect(orderRequest?.req.options?.triggerCardIds).toEqual(expect.arrayContaining(["BT6-082", "BT13-013"]));
    const destinationChoice = s.decisions.find(
      ({ req }) => req.kind === "selectCards" && req.sourceCardId === "BT13-013",
    );
    return { s, destinationCandidates: destinationChoice?.req.options?.candidateInstanceIds ?? [] };
  }

  it("lets the player order the Sistermon [On Play] and this card's [Your Turn] effect (Q2273)", async () => {
    const drawFirst = await playSistermonResolvingFirst("BT6-082");
    expect(drawFirst.destinationCandidates).toContain(drawFirst.s.inst("drawnSavior").instanceId);
    expect(drawFirst.destinationCandidates).toContain(drawFirst.s.inst("handSavior").instanceId);

    const digivolveFirst = await playSistermonResolvingFirst("BT13-013");
    expect(digivolveFirst.destinationCandidates).not.toContain(digivolveFirst.s.inst("drawnSavior").instanceId);
    expect(digivolveFirst.s.perm("bao").topCard.instanceId).toBe(digivolveFirst.s.inst("handSavior").instanceId);
  });
});
