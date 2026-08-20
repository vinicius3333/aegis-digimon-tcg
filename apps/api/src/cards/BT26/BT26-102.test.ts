import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-102 Seven Code PAD", () => {
  it("pays its six-card cost from battle-area Digimon, link cards, and trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-102", as: "pad" }],
          trash: [
            { card: "BT26-051", as: "trashOne" },
            { card: "BT26-063", as: "trashTwo" },
          ],
          battleArea: [
            {
              card: "BT26-010",
              linked: [{ card: "BT26-028", as: "recipientLink" }],
              as: "recipient",
            },
            {
              card: "BT26-019",
              linked: [{ card: "BT26-037", as: "donorLink" }],
              as: "donorOne",
            },
            { card: "BT26-084", as: "donorTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const pad = s.inst("pad");
    const expectedCostCards = [
      s.perm("donorOne").topCard!.instanceId,
      s.perm("donorTwo").topCard!.instanceId,
      s.inst("recipientLink").instanceId,
      s.inst("donorLink").instanceId,
      s.inst("trashOne").instanceId,
      s.inst("trashTwo").instanceId,
    ];
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: pad.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("recipient").stack.length === expectedCostCards.length);

    const recipient = s.perm("recipient");
    expect(recipient.stack.map((card) => card.instanceId).sort()).toEqual(expectedCostCards.sort());
    expect(recipient.stack.every((card) => card.faceUp)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("trashOne").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("trashTwo").instanceId);
  });

  it("plays an eligible Appmon from trash and returns itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT26-028", as: "appmon" }],
          security: [{ card: "BT26-102", as: "padSecurity" }, "AD1-001"],
        },
        1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
      },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const decision = s.decisions.find(({ req }) => req.kind === "selectCards");
    if (decision === undefined) throw new Error("Appmon selection was not requested");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("appmon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("padSecurity").instanceId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("appmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("padSecurity").instanceId)).toBe(true);
  });

  it("exposes Q7185 ordering and may decline Dantemon only after all six cards are placed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT26-102", as: "pad" },
            { card: "BT26-086", as: "dantemon" },
          ],
          trash: [
            { card: "BT26-010", as: "one" },
            { card: "BT26-019", as: "two" },
            { card: "BT26-028", as: "three" },
            { card: "BT26-037", as: "four" },
            { card: "BT26-051", as: "five" },
            { card: "BT26-063", as: "six" },
          ],
          battleArea: [{ card: "BT26-084", as: "recipient" }],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pad").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.state.pendingDecision!;
    expect(ordering.kind).toBe("orderCards");
    const orderingRequest = s.decisions.find(({ req }) => req.decisionId === ordering.decisionId)!.req;
    expect(orderingRequest.options?.orderDestination).toBe("stackBottom");
    const chosenBottomToTop = ["three", "one", "six", "two", "five", "four"].map(
      (alias) => s.inst(alias).instanceId,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: chosenBottomToTop },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    expect(s.perm("recipient").stack.map((card) => card.instanceId)).toEqual(chosenBottomToTop);
    const evolution = s.state.pendingDecision!;
    const evolutionRequest = s.decisions.find(({ req }) => req.decisionId === evolution.decisionId)!.req;
    expect(evolutionRequest.options).toMatchObject({ min: 0, max: 1 });
    expect(evolutionRequest.options?.candidateInstanceIds).toEqual([s.inst("dantemon").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: evolution.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("recipient").topCard!.cardId).toBe("BT26-084");
    expect(s.perm("recipient").stack.map((card) => card.instanceId)).toEqual(chosenBottomToTop);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dantemon").instanceId);
  });

  it("cannot pay only five of the exact six-card placement cost from Q7184", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-102", as: "pad" }],
        trash: ["BT26-010", "BT26-019", "BT26-028", "BT26-037", "BT26-051"],
        battleArea: [{ card: "BT26-084", as: "recipient" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pad").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length === 6);

    expect(s.perm("recipient").stack).toHaveLength(0);
  });

  it("adds itself to hand even when the optional Security play is declined", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-028", as: "appmon" }],
        security: [{ card: "BT26-102", as: "padSecurity" }],
      },
      1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("padSecurity").instanceId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("appmon").instanceId, s.inst("padSecurity").instanceId]),
    );
  });
});
