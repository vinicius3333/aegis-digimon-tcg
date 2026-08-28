import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
