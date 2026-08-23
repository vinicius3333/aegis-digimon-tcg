import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-070.js";

describe("P-070 Dorumon", () => {
  it("plays an eligible black low-cost Digimon and always adds itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          deck: [{ card: "BT7-056", as: "revealedDorumon" }],
          security: [{ card: "P-070", as: "promoDorumon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const promoId = s.inst("promoDorumon").instanceId;
    const revealedId = s.inst("revealedDorumon").instanceId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === promoId) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === revealedId),
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === promoId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === revealedId)).toBe(true);
  });

  it("adds the revealed card and itself to hand when the optional play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          deck: [{ card: "BT7-056", as: "revealedDorumon" }],
          security: [{ card: "P-070", as: "promoDorumon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    const promoId = s.inst("promoDorumon").instanceId;
    const revealedId = s.inst("revealedDorumon").instanceId;
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
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === promoId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === revealedId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([promoId, revealedId]),
    );
  });

  it("adds an ineligible revealed card and itself to hand without opening a play prompt", async () => {
    const s = setupEngine({
      0: {
        deck: [{ card: "BT1-009", as: "redDigimon" }],
        security: [{ card: "P-070", as: "promoDorumon" }],
      },
      1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
    });
    const promoId = s.inst("promoDorumon").instanceId;
    const revealedId = s.inst("redDigimon").instanceId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([promoId, revealedId]),
    );
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
  });

  it("Q4846: adds itself to hand even when the deck is empty", async () => {
    const s = setupEngine({
      0: { security: [{ card: "P-070", as: "promoDorumon" }] },
      1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
    });
    const promoId = s.inst("promoDorumon").instanceId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === promoId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([promoId]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
  });
});
