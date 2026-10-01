import "../ST1/ST1-10.js";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-016.js";
import "../BT6/BT6-082.js";

describe("BT13-016 SaviorHuckmon", () => {
  it("after an allied Sistermon play may digivolve into Jesmon while paying 2 less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-016", as: "savior" }],
          hand: [
            { card: "BT6-082", as: "sistermon" },
            { card: "BT13-017", as: "jesmon" },
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
    await settle(() => s.perm("savior").topCard.cardId === "BT13-017");
    await settle();
    expect(s.state.memory).toBe(6);
  });

  it("may decline the Sistermon-triggered Jesmon digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-016", as: "savior" }],
          hand: [
            { card: "BT6-082", as: "sistermon" },
            { card: "BT13-017", as: "jesmon" },
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

    expect(s.perm("savior").topCard.cardId).toBe("BT13-016");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("jesmon").instanceId)).toBe(true);
  });

  it("does not reduce a normal Jesmon digivolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-016", as: "savior" }], hand: [{ card: "BT13-017", as: "jesmon" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("savior").permanentId,
        instanceId: s.inst("jesmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("savior").topCard.cardId === "BT13-017");
    expect(s.perm("savior").stack.some((card) => card.cardId === "BT13-016")).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("when its Royal Knight host attacks, may play a Sistermon from trash for free only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-017", as: "host", under: ["BT13-016"] },
            { card: "BT13-017", as: "secondHost", under: ["BT13-016"] },
          ],
          trash: [
            { card: "BT6-082", as: "first" },
            { card: "BT6-082", as: "second" },
          ],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT6-082")).toHaveLength(
      1,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondHost").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT6-082")).toHaveLength(
      2,
    );
  });

  it("does not play Sistermon when the inherited host lacks the Royal Knight trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST1-10", as: "host", under: ["BT13-016"] }],
          trash: [{ card: "BT6-082", as: "sistermon" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sistermon").instanceId)).toBe(true);
  });

  it("may decline the inherited Sistermon play even for a Royal Knight host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-017", as: "host", under: ["BT13-016"] }],
          trash: [{ card: "BT6-082", as: "sistermon" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sistermon").instanceId)).toBe(true);
  });

  it("resets the inherited Sistermon play budget on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-017", as: "host", under: ["BT13-016"] }],
          trash: [
            { card: "BT6-082", as: "first" },
            { card: "BT6-082", as: "second" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-010", "BT1-009"], deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const initialOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT6-082").length === 1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await initialOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT6-082").length === 2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });
});

describe("BT13-016 SaviorHuckmon — KB Q&A rulings", () => {
  async function playSistermonResolvingFirst(firstCardId: string) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-016", as: "savior" }],
          hand: [
            { card: "BT6-082", as: "sistermon" },
            { card: "BT13-017", as: "handJesmon" },
          ],
          deck: [{ card: "BT13-017", as: "drawnJesmon" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [firstCardId] },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sistermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("savior").topCard.cardId === "BT13-017");
    await settle();

    const orderRequest = s.decisions.find(({ req }) => req.kind === "orderTriggers");
    expect(orderRequest?.seat).toBe(0);
    expect(orderRequest?.req.options?.triggerCardIds).toEqual(expect.arrayContaining(["BT6-082", "BT13-016"]));
    const destinationChoice = s.decisions.find(
      ({ req }) => req.kind === "selectCards" && req.sourceCardId === "BT13-016",
    );
    return { s, destinationCandidates: destinationChoice?.req.options?.candidateInstanceIds ?? [] };
  }

  it("lets the player order the Sistermon [On Play] and this card's [Your Turn] effect (Q2275)", async () => {
    const drawFirst = await playSistermonResolvingFirst("BT6-082");
    expect(drawFirst.destinationCandidates).toContain(drawFirst.s.inst("drawnJesmon").instanceId);
    expect(drawFirst.destinationCandidates).toContain(drawFirst.s.inst("handJesmon").instanceId);

    const digivolveFirst = await playSistermonResolvingFirst("BT13-016");
    expect(digivolveFirst.destinationCandidates).not.toContain(digivolveFirst.s.inst("drawnJesmon").instanceId);
    expect(digivolveFirst.s.perm("savior").topCard.instanceId).toBe(digivolveFirst.s.inst("handJesmon").instanceId);
  });
});
