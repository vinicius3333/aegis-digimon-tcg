import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT9/BT9-047.js";
import "./ST13-02.js";

describe("ST13-02 Zubamon", () => {
  it("places itself under a Legend-Arms host and plays the revealed eligible card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-05", as: "host" }],
          hand: [{ card: "ST13-02", as: "zubamon" }],
          deck: ["ST13-09"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zubamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-09"));
    expect(s.perm("host").stack.some((card) => card.cardId === "ST13-02")).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("may decline the placement cost and leave the revealed card in the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-05", as: "host" }],
          hand: [{ card: "ST13-02", as: "zubamon" }],
          deck: ["ST13-07"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zubamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST13-02"));

    expect(s.perm("host").stack.some((card) => card.cardId === "ST13-02")).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toContain("ST13-07");
  });

  it("adds an ineligible revealed card to hand after paying the placement cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-05", as: "host" }],
          hand: [{ card: "ST13-02", as: "zubamon" }],
          deck: ["ST13-16"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zubamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "ST13-16"));

    expect(s.perm("host").stack.at(-1)?.cardId).toBe("ST13-02");
  });

  it("deletes only a 3000-DP Digimon with its inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST13-03", as: "attacker", under: ["ST13-02"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "eligible", dp: 3000 },
            { card: "BT1-009", as: "too-large", dp: 4000 },
          ],
        },
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
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("too-large").permanentId);
  });
});

describe("ST13-02 Zubamon — KB Q&A rulings", () => {
  it("may decline its [On Play] placement and stays in the battle area as a Digimon (Q766)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-05", as: "host" }],
          hand: [{ card: "ST13-02", as: "zubamon" }],
          deck: [{ card: "ST13-09", as: "revealCandidate" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zubamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.length > 0 && s.state.pendingDecision === undefined);
    await drainMicrotasks();
    expect(s.decisions.map(({ req }) => [req.kind, req.sourceCardId])).toEqual([["optional", "ST13-02"]]);

    expect(s.perm("zubamon").topCard.instanceId).toBe(s.inst("zubamon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.perm("host").stack.map((card) => card.cardId)).not.toContain("ST13-02");
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("revealCandidate").instanceId]);
    expect(s.state.memory).toBe(7);
  });

  it("may choose not to play the revealed Legend-Arms card and adds it to hand instead (Q767)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-05", as: "host" }],
          hand: [{ card: "ST13-02", as: "zubamon" }],
          deck: [{ card: "BT3-064", as: "revealed" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Zubamon"] },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zubamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId));
    await drainMicrotasks();

    const playOffer = s.decisions.find(({ req }) => req.kind === "selectCards" && req.sourceCardId === "ST13-02");
    expect(playOffer?.req.options?.candidateInstanceIds).toEqual([s.inst("revealed").instanceId]);
    expect(playOffer?.req.options?.min).toBe(0);
    expect(s.perm("host").stack[0]?.cardId).toBe("ST13-02");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["ST13-05"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("revealed").instanceId]);
  });

  it("adds the revealed Legend-Arms card to hand when [BT9-047 Pomumon] forbids playing it (Q768)", async () => {
    const resolveZubamonReveal = async (withPomumon: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST13-05", as: "host" }],
            hand: [{ card: "ST13-02", as: "zubamon" }],
            deck: [{ card: "BT3-064", as: "revealed" }],
          },
          1: { battleArea: withPomumon ? [{ card: "BT9-047", as: "pomumon" }] : [] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zubamon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.deck.length === 0 && s.state.pendingDecision === undefined);
      await drainMicrotasks();

      expect(s.perm("host").stack[0]?.cardId).toBe("ST13-02");
      return {
        battleArea: s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId),
        hand: s.state.players[0]!.hand.map((card) => card.cardId),
      };
    };

    await expect(resolveZubamonReveal(false)).resolves.toEqual({ battleArea: ["ST13-05", "BT3-064"], hand: [] });
    await expect(resolveZubamonReveal(true)).resolves.toEqual({ battleArea: ["ST13-05"], hand: ["BT3-064"] });
  });
});
