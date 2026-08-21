import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-095.js";
import "./BT6-109.js";
import "./BT6-112.js";

describe("BT6 Three Musketeers deck", () => {
  it("plays BeelStarmon for zero from twelve mixed trash reducers and fires Happy Bullet Showering", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [{ card: "BT6-112", as: "beelstarmon" }],
          trash: [
            { card: "BT6-095", as: "happyBullet" },
            ...Array.from({ length: 5 }, () => "BT6-095"),
            ...Array.from({ length: 6 }, () => "BT6-017"),
          ],
        },
        1: { battleArea: [{ card: "BT6-075", as: "deleteTarget" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const targetId = s.perm("deleteTarget").permanentId;
    const happyBulletId = s.inst("happyBullet").instanceId;
    preferred.push(happyBulletId);
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("beelstarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-112") &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === happyBulletId),
      5000,
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === happyBulletId)).toBe(true);
  });

  it("offers multiple cost-7 Options by instance ID and resolves only the selected toolbox answer", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT6-112", as: "beelstarmon" },
          { card: "BT6-095", as: "happyBullet" },
        ],
        trash: [
          { card: "BT6-109", as: "flyBullet" },
          "BT6-017",
        ],
      },
      1: {
        battleArea: [
          { card: "BT6-075", as: "levelSixTarget" },
          { card: "BT1-009", as: "lowDpBystander" },
        ],
      },
    });
    const flyBulletId = s.inst("flyBullet").instanceId;
    const happyBulletId = s.inst("happyBullet").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("beelstarmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const recoverDecision = s.decisions.at(-1)!.req;
    expect(recoverDecision.kind).toBe("selectCards");
    expect(recoverDecision.sourceCardId).toBe("BT6-112");
    expect(recoverDecision.options?.candidateInstanceIds).toEqual([
      flyBulletId,
    ]);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: recoverDecision.decisionId,
      response: {
        kind: "selectCards",
        instanceIds: [flyBulletId],
      },
    })).toEqual({ ok: true });
    await settle(() =>
      s.decisions.some(({ req }) =>
        req.decisionId !== recoverDecision.decisionId &&
        req.kind === "selectCards" &&
        req.options?.candidateInstanceIds?.length === 2
      )
    );

    const useDecision = s.decisions.find(({ req }) =>
      req.decisionId !== recoverDecision.decisionId &&
      req.kind === "selectCards" &&
      req.options?.candidateInstanceIds?.length === 2
    )!.req;
    expect(useDecision.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([
        happyBulletId,
        flyBulletId,
      ]),
    );
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: useDecision.decisionId,
      response: {
        kind: "selectCards",
        instanceIds: [flyBulletId],
      },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const targetDecision = s.decisions.at(-1)!.req;
    expect(targetDecision.kind).toBe("chooseTargets");
    expect(targetDecision.options?.candidateInstanceIds).toContain(
      s.perm("levelSixTarget").permanentId,
    );
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: targetDecision.decisionId,
      response: {
        kind: "chooseTargets",
        instanceIds: [s.perm("levelSixTarget").permanentId],
      },
    })).toEqual({ ok: true });
    await settle(() =>
      !s.state.players[1]!.battleArea.some((permanent) =>
        permanent.topCard.cardId === "BT6-075"
      ) && s.state.pendingDecision === undefined
    );

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
      "BT1-009",
    ]);
    expect(s.state.players[0]!.hand.some((card) =>
      card.instanceId === happyBulletId
    )).toBe(true);
    await settle(() => s.state.players[0]!.trash.some((card) =>
      card.instanceId === flyBulletId
    ));
    expect(s.state.players[0]!.trash.some((card) =>
      card.instanceId === flyBulletId
    )).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
