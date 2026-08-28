import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-071.js";
import "./BT6-073.js";
import "./BT6-075.js";
import "./BT6-078.js";

describe("Ginkakumon Promote purple discard deck", () => {
  it("orders both Demon sources, Rush attacks, discards SkullGreymon, deletes, and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT6-075", as: "promote" }],
          trash: [
            { card: "BT6-071", as: "kinkakumon" },
            { card: "BT6-073", as: "ginkakumon" },
          ],
          deck: [{ card: "BT6-078", as: "skullGreymon" }],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "levelThree" }],
          security: ["BT1-011"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderCards: false,
        autoOrderTriggers: true,
      },
    );
    s.state.memory = 10;
    const promoteInstanceId = s.inst("promote").instanceId;
    const promote = () =>
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === promoteInstanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: promoteInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.at(-1)!.req;
    const stackOrder = [s.inst("ginkakumon").instanceId, s.inst("kinkakumon").instanceId];
    expect(ordering.sourceCardId).toBe("BT6-075");
    expect(ordering.options?.orderDestination).toBe("stackBottom");
    expect(ordering.options?.visibleCards).toEqual([
      { instanceId: s.inst("kinkakumon").instanceId, cardId: "BT6-071" },
      { instanceId: s.inst("ginkakumon").instanceId, cardId: "BT6-073" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: stackOrder },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        promote()?.stack.length === 2 &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("skullGreymon").instanceId) &&
        s.state.memory === 5,
    );

    expect(promote()?.stack.map((card) => card.instanceId)).toEqual(stackOrder);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: promote()!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.memory === 6 &&
        promote()?.stack.some((card) => card.instanceId === s.inst("skullGreymon").instanceId) === true,
    );

    expect(promote()?.stack.map((card) => card.instanceId)).toEqual([s.inst("skullGreymon").instanceId, ...stackOrder]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
  });
});
