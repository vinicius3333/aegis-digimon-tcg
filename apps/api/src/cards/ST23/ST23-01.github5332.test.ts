import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("GitHub #5332 Geckomon inherited cost selection", () => {
  it.each([0, 1])("two Tamers: manually pays suspended Tamer %s before evolving the attacker", async (payer) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST23-06", as: "gecko", under: [{ card: "ST23-01", as: "egg" }] },
          ...["ST23-13", "BT25-090"].map((card, index) => ({
            card,
            as: `tamer-${index}`,
            suspended: true,
            under: [
              { card: "BT1-009", as: `bottom-${index}`, faceUp: false },
              { card: "ST23-02", as: `next-${index}`, faceUp: false },
            ],
          })),
          { card: "ST23-13", as: "face-up-only", suspended: true, under: [{ card: "ST23-02", faceUp: true }] },
        ],
        hand: [
          { card: "ST23-07", as: "evolution" },
          { card: "ST23-07", as: "other-evolution" },
          { card: "BT1-009", as: "illegal" },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { security: ["BT1-009", "BT1-009"] },
    });
    await s.ready();
    s.state.memory = 10;
    const attackerId = s.perm("gecko").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const consent = s.decisions.at(-1)!.req;
    expect(consent.sourceInstanceId).toBe(s.inst("egg").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: consent.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.at(-1)?.req.options?.purpose === "cost");
    const cost = s.decisions.at(-1)!.req;
    expect(cost).toMatchObject({
      kind: "selectCards",
      sourceCardId: "ST23-01",
      sourcePermanentId: attackerId,
      options: { min: 1, max: 1, purpose: "cost", isInherited: true },
    });
    expect(cost.options?.candidateInstanceIds).toEqual([s.inst("tamer-0").instanceId, s.inst("tamer-1").instanceId]);
    expect(cost.options?.visibleCards?.map((card) => card.cardId)).toEqual(["ST23-13", "BT25-090"]);
    // Replay the production reconnect/ready order; readiness must preserve the unpaid decision.
    expect(s.engine.applyIntent(0, { type: "ready" })).toEqual({ ok: true });
    expect(s.state.pendingDecision?.decisionId).toBe(cost.decisionId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cost.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("evolution").instanceId] },
      }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision?.decisionId).toBe(cost.decisionId);
    const bottom = s.inst(`bottom-${payer}`).instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cost.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst(`tamer-${payer}`).instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const may = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: may.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const evolution = s.decisions.at(-1)!.req;
    expect(evolution.options?.candidateInstanceIds).toEqual([
      s.inst("evolution").instanceId,
      s.inst("other-evolution").instanceId,
    ]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bottom)).toBe(true);
    expect(s.perm(`tamer-${payer}`).stack.map((card) => card.instanceId)).toEqual([s.inst(`next-${payer}`).instanceId]);
    expect(s.perm(`tamer-${1 - payer}`).stack).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: evolution.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("evolution").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackEnded") && s.state.pendingDecision === undefined);
    expect(s.perm("gecko").permanentId).toBe(attackerId);
    expect(s.perm("gecko").topCard.cardId).toBe("ST23-07");
    expect(s.perm("gecko").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(10);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(0);
  });

  it("one suspended Tamer pays automatically, while a face-up-only Tamer cannot pay", async () => {
    for (const faceUp of [false, true]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "ST23-06", as: "gecko", under: ["ST23-01"] },
              { card: "ST23-13", as: "tamer", suspended: true, under: [{ card: "BT1-009", as: "cost", faceUp }] },
            ],
            hand: [{ card: "ST23-07", as: "evolution" }],
            deck: ["BT1-009", "BT1-009"],
          },
          1: { security: ["BT1-009", "BT1-009"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      await s.ready();
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("gecko").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.events.some((event) => event.kind === "attackEnded") && s.state.pendingDecision === undefined,
      );
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolution").instanceId)).toBe(faceUp);
      expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST23-06")).toBe(faceUp);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST23-07")).toBe(!faceUp);
      expect(s.perm("tamer").stack).toHaveLength(faceUp ? 1 : 0);
      expect(s.decisions.some(({ req }) => req.options?.purpose === "cost")).toBe(false);
    }
  });
});
