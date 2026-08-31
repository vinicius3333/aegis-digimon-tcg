import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-069.js";
import "./BT7-072.js";
import "./BT7-091.js";

describe("BT7 Eyesmon discard deck gauntlet", () => {
  it("distinguishes duplicate Eyesmon in Koichi's UI and plays only the discarded copy", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-091", as: "koichi" },
            { card: "BT7-072", as: "discardedEyesmon" },
            { card: "BT7-072", as: "keptEyesmon" },
          ],
          deck: [{ card: "BT7-070", as: "drawnWendigomon" }],
          trash: [
            { card: "BT7-069", as: "scatterOne" },
            { card: "BT7-069", as: "scatterTwo" },
          ],
        },
        1: {
          battleArea: [{ card: "BT2-047", as: "battleTarget", dp: 8000, suspended: true }],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    const discardedEyesmonId = s.inst("discardedEyesmon").instanceId;
    const keptEyesmonId = s.inst("keptEyesmon").instanceId;
    const drawnWendigomonId = s.inst("drawnWendigomon").instanceId;
    const targetId = s.perm("battleTarget").permanentId;
    preferred.push(discardedEyesmonId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("koichi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === discardedEyesmonId) &&
        s.state.pendingDecision === undefined,
    );
    await settle();

    const discardChoice = s.decisions.find(
      ({ req }) =>
        req.kind === "selectCards" &&
        req.sourceCardId === "BT7-091" &&
        req.options?.candidateInstanceIds?.includes(discardedEyesmonId),
    )?.req;
    expect(new Set(discardChoice?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([discardedEyesmonId, keptEyesmonId, drawnWendigomonId]),
    );
    expect(new Set(discardChoice?.options?.visibleInstanceIds ?? [])).toEqual(
      new Set([discardedEyesmonId, keptEyesmonId, drawnWendigomonId]),
    );

    const eyesmon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === discardedEyesmonId)!;
    expect(eyesmon.currentDP).toBe(9000);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT7-072")).toHaveLength(1);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === keptEyesmonId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === discardedEyesmonId)).toBe(false);
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: eyesmon.permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId)).toBe(true);

    assertNoLoudGap(s);
  });
});
