import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-017.js";
import "./EX2-058.js";

describe("EX2 Leomon/Jeri blocker deck", () => {
  it("plays one duplicate Leomon, draws on attack, then converts a real block deletion into memory and a second draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-058", as: "alreadySuspendedJeri", suspended: true }],
          hand: [
            { card: "EX2-058", as: "newJeri" },
            { card: "EX2-017", as: "firstLeomon" },
            { card: "EX2-017", as: "secondLeomon" },
          ],
          deck: [
            { card: "BT1-009", as: "firstDraw" },
            { card: "BT1-010", as: "secondDraw" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-084", as: "attacker" }],
          security: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    const firstLeomonId = s.inst("firstLeomon").instanceId;
    const secondLeomonId = s.inst("secondLeomon").instanceId;
    const newJeriId = s.inst("newJeri").instanceId;
    const priorDecisionCount = s.decisions.length;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: newJeriId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return s.decisions.length > priorDecisionCount && req?.sourceCardId === "EX2-058" && req.kind === "selectCards";
    });

    const playDecision = s.decisions.at(-1)!.req;
    expect(new Set(playDecision.options?.candidateInstanceIds)).toEqual(new Set([firstLeomonId, secondLeomonId]));
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [secondLeomonId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === secondLeomonId) &&
        s.state.memory === 6 &&
        s.state.pendingDecision === undefined,
    );
    await settle();

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === firstLeomonId)).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === secondLeomonId)).toBe(false);

    const leomon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === secondLeomonId);
    expect(leomon).toBeDefined();
    const leomonPermanentId = leomon!.permanentId;
    const newJeri = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === newJeriId);
    expect(newJeri).toBeDefined();

    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(leomon!, "Blocker")).toBe(true);

    const blockWindowCount = s.events.filter(({ kind }) => kind === "blockWindowOpened").length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter(({ kind }) => kind === "blockWindowOpened").length > blockWindowCount && newJeri!.isSuspended,
    );

    expect(s.perm("alreadySuspendedJeri").isSuspended).toBe(true);
    expect(newJeri!.isSuspended).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: leomonPermanentId,
      }),
    ).toEqual({ ok: true });

    const startingDrawIds = new Set([s.inst("firstDraw").instanceId, s.inst("secondDraw").instanceId]);
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === leomonPermanentId) &&
        s.state.players[0]!.deck.length === 0 &&
        s.state.memory === 3 &&
        s.events.some(({ kind }) => kind === "combatResolved"),
    );

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === secondLeomonId)).toBe(true);
    expect(s.state.players[0]!.hand.filter(({ instanceId }) => startingDrawIds.has(instanceId))).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });
});
