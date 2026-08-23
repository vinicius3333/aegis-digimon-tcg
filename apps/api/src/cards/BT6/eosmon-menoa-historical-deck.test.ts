import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-083.js";
import "./BT6-085.js";
import "./BT6-086.js";
import "./BT6-092.js";

describe("BT6 Eosmon/Menoa historical deck", () => {
  it("chains attack-time Eosmon play, Menoa reveal, and the level 6 source swarm", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-085", as: "attacker" },
            { card: "BT6-092", as: "menoa" },
            { card: "BT6-088", as: "secondTamer" },
          ],
          hand: [
            { card: "BT6-085", as: "playedEosmon" },
            { card: "BT6-086", as: "levelSix" },
          ],
          trash: [
            { card: "BT6-083", as: "trashEosmonOne" },
            { card: "BT6-085", as: "trashEosmonTwo" },
            { card: "BT6-085", as: "trashEosmonThree" },
          ],
          deck: [
            { card: "BT6-083", as: "revealedEosmon" },
            { card: "BT1-009", as: "revealBottomOne" },
            { card: "BT1-010", as: "revealBottomTwo" },
            { card: "BT1-011", as: "digivolutionDraw" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT6-087", as: "opponentTamer" },
            { card: "BT6-075", as: "deleteTarget" },
          ],
          security: ["BT1-012"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(
      s.inst("playedEosmon").instanceId,
      s.inst("revealedEosmon").instanceId,
      s.inst("trashEosmonOne").instanceId,
      s.inst("trashEosmonTwo").instanceId,
      s.inst("trashEosmonThree").instanceId,
      s.perm("deleteTarget").permanentId,
    );
    s.state.memory = 10;
    const playedEosmonId = s.inst("playedEosmon").instanceId;
    const revealedEosmonId = s.inst("revealedEosmon").instanceId;
    const deleteTargetId = s.perm("deleteTarget").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedEosmonId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === revealedEosmonId) &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.perm("menoa").isSuspended).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("digivolutionDraw").instanceId,
      s.inst("revealBottomOne").instanceId,
      s.inst("revealBottomTwo").instanceId,
    ]);
    expect(s.state.players[1]!.security).toHaveLength(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("attacker").permanentId,
        instanceId: s.inst("levelSix").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === deleteTargetId) &&
        s.perm("attacker").stack.length === 4,
    );

    expect(s.perm("attacker").stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("trashEosmonOne").instanceId,
        s.inst("trashEosmonTwo").instanceId,
        s.inst("trashEosmonThree").instanceId,
      ]),
    );
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("digivolutionDraw").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("exposes duplicate Eosmon sources and identical deletion targets with stable UI ids", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-085", as: "base" },
          { card: "BT6-092", as: "menoa" },
          { card: "BT6-088", as: "secondTamer" },
        ],
        hand: [{ card: "BT6-086", as: "levelSix" }],
        trash: [
          { card: "BT6-085", as: "sourceOne" },
          { card: "BT6-085", as: "sourceTwo" },
          { card: "BT6-085", as: "sourceThree" },
        ],
        deck: ["BT1-001"],
      },
      1: {
        battleArea: [
          { card: "BT6-087", as: "opponentTamer" },
          { card: "BT6-075", as: "emptyCopy" },
          { card: "BT6-075", as: "stackedCopy", under: ["BT1-001", "BT1-002"] },
        ],
      },
    });
    s.state.memory = 10;
    const sourceIds = [
      s.inst("sourceOne").instanceId,
      s.inst("sourceTwo").instanceId,
      s.inst("sourceThree").instanceId,
    ];

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("levelSix").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "optional" &&
        latest.sourceCardId === "BT6-086"
      );
    });

    const optionalDecision = s.decisions.at(-1)!.req;
    expect(optionalDecision.kind).toBe("optional");
    expect(optionalDecision.sourceCardId).toBe("BT6-086");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optionalDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "selectCards" &&
        latest.sourceCardId === "BT6-086"
      );
    });

    const sourceDecision = s.decisions.at(-1)!.req;
    expect(sourceDecision.options).toMatchObject({ min: 0, max: 3 });
    expect(sourceDecision.options?.candidateInstanceIds).toEqual(sourceIds);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: sourceDecision.decisionId,
        response: { kind: "selectCards", instanceIds: sourceIds.slice(0, 2) },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "chooseTargets" &&
        latest.sourceCardId === "BT6-086"
      );
    });

    const targetDecision = s.decisions.at(-1)!.req;
    const targetIds = [s.perm("emptyCopy").permanentId, s.perm("stackedCopy").permanentId];
    expect(targetDecision.options?.candidateInstanceIds).toEqual(targetIds);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetDecision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("stackedCopy").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetIds[1]),
    );

    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(sourceIds.slice(0, 2)));
    expect(s.perm("base").stack.some((card) => card.instanceId === sourceIds[2])).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("emptyCopy").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT6-075")).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
