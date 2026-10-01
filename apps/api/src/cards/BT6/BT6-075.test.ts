import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-075.js";

describe("BT6-075 Ginkakumon Promote", () => {
  it("has Rush and can attack on the turn it is played", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT6-075", as: "promote" }] },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("promote").instanceId })).toEqual({
      ok: true,
    });
    const played = s.state.players[0]!.battleArea[0]!;
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0);
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: played.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("places one card of each required name, then draws 1 and gains 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT6-075", as: "promote" }],
          deck: [{ card: "BT1-009", as: "drawnCard" }],
          trash: [
            { card: "BT6-071", as: "kinkakumonA" },
            { card: "BT6-071", as: "kinkakumonB" },
            { card: "BT6-073", as: "ginkakumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const promoteId = s.inst("promote").instanceId;
    const promote = () => player.battleArea.find((permanent) => permanent.topCard?.instanceId === promoteId);
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: promoteId })).toEqual({ ok: true });
    await settle(
      () =>
        promote()?.stack.length === 2 &&
        player.hand.some((card) => card.instanceId === s.inst("drawnCard").instanceId) &&
        s.state.memory === 1,
    );

    expect(promote()?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT6-071", "BT6-073"]));
    expect(player.trash.map((card) => card.cardId)).toEqual(["BT6-071"]);
    expect(s.state.memory).toBe(1);
  });

  it("publishes the two exact-name cards for ordering before placing them", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT6-075", as: "promote" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          trash: [
            { card: "BT6-071", as: "kinkakumon" },
            { card: "BT6-073", as: "ginkakumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("promote").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const decision = s.decisions.at(-1)!.req;
    const order = [s.inst("ginkakumon").instanceId, s.inst("kinkakumon").instanceId];
    expect(decision.sourceCardId).toBe("BT6-075");
    expect(decision.options?.visibleCards).toEqual(
      expect.arrayContaining([
        { instanceId: s.inst("kinkakumon").instanceId, cardId: "BT6-071" },
        { instanceId: s.inst("ginkakumon").instanceId, cardId: "BT6-073" },
      ]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "orderCards", order },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.instanceId)).toEqual(order);
  });

  it("places the only available exact name but does not draw or gain memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT6-075", as: "promote" }],
          deck: [{ card: "BT1-009", as: "notDrawn" }],
          trash: [{ card: "BT6-071", as: "onlyKinkakumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("promote").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea[0]!.stack.some((card) => card.instanceId === s.inst("onlyKinkakumon").instanceId),
    );

    expect(s.state.players[0]!.battleArea[0]!.stack[0]!.instanceId).toBe(s.inst("onlyKinkakumon").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("does not offer placement when trash has no required exact name", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT6-075", as: "promote" }],
        deck: [{ card: "BT1-009", as: "notDrawn" }],
        trash: [{ card: "BT1-010", as: "unrelatedDigimon" }],
      },
    });
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("promote").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT6-075")).toBe(false);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash[0]!.instanceId).toBe(s.inst("unrelatedDigimon").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });
});

describe("BT6-075 Ginkakumon Promote — KB Q&A rulings", () => {
  it("cannot place [Ginkakumon Promote] from the trash, because only the exact names [Kinkakumon] and [Ginkakumon] qualify (Q1464)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT6-075", as: "played" }],
          deck: [{ card: "BT1-009", as: "notDrawn" }],
          trash: [
            { card: "BT6-075", as: "promoteInTrash" },
            { card: "BT6-071", as: "kinkakumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea[0]?.stack.length === 1);
    await settle();

    const selections = s.decisions.filter(({ req }) => req.kind === "selectCards" && req.sourceCardId === "BT6-075");
    for (const { req } of selections) {
      expect(req.options?.candidateInstanceIds ?? []).not.toContain(s.inst("promoteInTrash").instanceId);
    }
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.instanceId)).toEqual([
      s.inst("kinkakumon").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("promoteInTrash").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("may decline to place both cards, but once it places it must place one of each name (Q1465)", async () => {
    function setupWithBothNamesInTrash(options: SetupEngineOptions) {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT6-075", as: "promote" }],
            deck: [{ card: "BT1-009", as: "drawn" }],
            trash: [
              { card: "BT6-071", as: "kinkakumonA" },
              { card: "BT6-071", as: "kinkakumonB" },
              { card: "BT6-073", as: "ginkakumon" },
            ],
          },
        },
        options,
      );
      s.state.memory = 6;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("promote").instanceId })).toEqual({
        ok: true,
      });
      return s;
    }

    const declined = setupWithBothNamesInTrash({ autoDeclineOptional: true });
    await settle(() => declined.engine.mainVerbContinuationsInFlight === 0);
    await settle();
    expect(declined.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(declined.state.players[0]!.trash).toHaveLength(3);
    expect(declined.state.players[0]!.hand).toHaveLength(0);

    const accepted = setupWithBothNamesInTrash({ autoAcceptOptional: true });
    await settle(() => accepted.state.pendingDecision?.kind === "selectCards");
    const kinkakumonPick = accepted.state.pendingDecision!;
    const pickPayload = JSON.parse(kinkakumonPick.payloadJson ?? "{}") as { min: number; max: number };
    expect(pickPayload).toMatchObject({ min: 1, max: 1 });
    expect(
      accepted.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: kinkakumonPick.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(
      accepted.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: kinkakumonPick.decisionId,
        response: { kind: "selectCards", instanceIds: [accepted.inst("kinkakumonB").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      accepted.state.players[0]!.hand.some((card) => card.instanceId === accepted.inst("drawn").instanceId),
    );

    expect(accepted.state.players[0]!.battleArea[0]!.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([accepted.inst("kinkakumonB").instanceId, accepted.inst("ginkakumon").instanceId]),
    );
    expect(accepted.state.players[0]!.battleArea[0]!.stack).toHaveLength(2);
    expect(accepted.state.memory).toBe(1);
  });
});
