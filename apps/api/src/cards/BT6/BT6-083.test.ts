import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT17/BT17-076.js";
import "./BT6-083.js";
import "./BT6-087.js";
import "./BT6-092.js";

describe("BT6-083 Eosmon", () => {
  it("may play a white Tamer from hand when its host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-085", under: ["BT6-083"], as: "attacker" }],
          hand: [{ card: "BT6-092", as: "tamer" }],
        },
        1: { security: ["BT6-074"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    ).toBe(true);
  });

  it("may play a white Tamer, then lets the opponent play a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT6-083", as: "source" },
            { card: "BT6-092", as: "myTamer" },
          ],
        },
        1: { hand: [{ card: "BT6-087", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mine = s.state.players[0] as PlayerState;
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        mine.battleArea.some((p) => p.topCard?.instanceId === s.inst("myTamer").instanceId) &&
        opponent.battleArea.some((p) => p.topCard?.instanceId === s.inst("opponentTamer").instanceId),
    );
    expect(s.state.memory).toBe(0);
  });
});

function isOnBattleArea(s: EngineSetup, seat: 0 | 1, alias: string): boolean {
  return s.state.players[seat]!.battleArea.some(
    (permanent) => permanent.topCard?.instanceId === s.inst(alias).instanceId,
  );
}

async function pendingDecisionFor(s: EngineSetup, seat: 0 | 1) {
  await settle(() => s.state.pendingDecision?.seat === seat);
  return s.decisions.at(-1)!;
}

async function playEosmonWithAllTurnsEosmonInPlay(firstTriggerCardId: string): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT17-076", as: "megaEosmon" }],
        hand: [
          { card: "BT6-083", as: "playedEosmon" },
          { card: "BT6-092", as: "menoa" },
        ],
      },
      1: { battleArea: [{ card: "BT1-010", as: "fiveThousandDP", dp: 5000 }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [firstTriggerCardId] },
  );
  s.state.memory = 4;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedEosmon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => isOnBattleArea(s, 0, "menoa") && s.state.pendingDecision === undefined);
  const order = s.decisions.find(({ req }) => req.kind === "orderTriggers");
  expect(order?.req.options?.triggerCardIds).toEqual(expect.arrayContaining(["BT6-083", "BT17-076"]));
  return s;
}

describe("BT6-083 Eosmon — KB Q&A rulings", () => {
  it("lets the opponent play a Tamer even when you decline to play yours (Q1469)", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT6-083", as: "source" },
          { card: "BT6-092", as: "myTamer" },
        ],
      },
      1: { hand: [{ card: "BT6-087", as: "opponentTamer" }] },
    });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });

    const ownOffer = await pendingDecisionFor(s, 0);
    expect(ownOffer.req.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ownOffer.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });

    const opponentOffer = await pendingDecisionFor(s, 1);
    expect(opponentOffer.req.options?.candidateInstanceIds).toContain(s.inst("opponentTamer").instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: opponentOffer.req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("opponentTamer").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => isOnBattleArea(s, 1, "opponentTamer"));

    expect(isOnBattleArea(s, 0, "myTamer")).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("myTamer").instanceId);
    expect(isOnBattleArea(s, 1, "opponentTamer")).toBe(true);
  });

  it("lets BT17-076 delete up to the played Eosmon's DP at resolution, after a Tamer raised it to 5000 (Q2845)", async () => {
    const tamerFirst = await playEosmonWithAllTurnsEosmonInPlay("BT6-083");
    expect(tamerFirst.perm("playedEosmon").currentDP).toBe(5000);
    expect(tamerFirst.state.players[1]!.trash.map((card) => card.instanceId)).toContain(
      tamerFirst.inst("fiveThousandDP").instanceId,
    );

    const deletionFirst = await playEosmonWithAllTurnsEosmonInPlay("BT17-076");
    expect(deletionFirst.perm("playedEosmon").currentDP).toBe(5000);
    expect(isOnBattleArea(deletionFirst, 1, "fiveThousandDP")).toBe(true);
  });
});
