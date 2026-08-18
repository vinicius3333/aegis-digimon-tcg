import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-035.js";
import "./BT7-038.js";
import "./BT7-042.js";
import "./BT7-088.js";

describe("BT7 Yellow Hybrid security deck gauntlet", () => {
  it("searches security in the UI, climbs from Zoe, then replaces a deleted Ten Warrior", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-088", as: "zoe" },
            { card: "BT7-038", as: "jetSilphymon" },
            { card: "BT7-042", as: "ancientKazemon" },
            { card: "BT7-035", as: "spareKazemon" },
            { card: "BT7-036", as: "zephyrmon" },
          ],
          security: [
            { card: "BT1-010", as: "nonHybridSecurity" },
            { card: "BT7-035", as: "searchedKazemon" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    const nonHybridSecurityId = s.inst("nonHybridSecurity").instanceId;
    const searchedKazemonId = s.inst("searchedKazemon").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("zoe").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const securityChoice = s.decisions.at(-1)!.req;
    expect(securityChoice.sourceCardId).toBe("BT7-088");
    expect(securityChoice.options?.visibleInstanceIds).toEqual(
      expect.arrayContaining([nonHybridSecurityId, searchedKazemonId]),
    );
    expect(securityChoice.options?.candidateInstanceIds).toEqual([searchedKazemonId]);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: securityChoice.decisionId,
      response: { kind: "selectCards", instanceIds: [searchedKazemonId] },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.pendingDecision === undefined &&
      s.state.players[0]!.hand.some(({ instanceId }) => instanceId === searchedKazemonId)
    );
    await settle();

    const hybridLine = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("zoe").instanceId,
    )!;
    const hybridLineId = hybridLine.permanentId;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: hybridLineId,
      instanceId: searchedKazemonId,
    })).toEqual({ ok: true });
    await settle(() => hybridLine.topCard.instanceId === searchedKazemonId);
    await settle();
    expect(s.state.memory).toBe(5);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: hybridLineId,
      instanceId: s.inst("jetSilphymon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => hybridLine.topCard.instanceId === s.inst("jetSilphymon").instanceId);
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(hybridLine.stack.map(({ cardId }) => cardId)).toEqual(["BT7-088", "BT7-035"]);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(4);

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: hybridLineId,
      instanceId: s.inst("ancientKazemon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      hybridLine.topCard.instanceId === s.inst("ancientKazemon").instanceId &&
      s.state.memory === 5
    );
    await settle();
    expect(s.state.memory).toBe(5);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(s.state.turnSeat).toBe(1);
    expect(hybridLine.currentDP).toBe(13000);
    expect(observe(s.engine).securityDp(0)).toBe(7000);

    const deletion = advance(s.engine).verb.deletePermanent([hybridLineId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const replacementChoice = s.decisions.at(-1)!.req;
    expect(replacementChoice.sourceCardId).toBe("BT7-042");
    expect(new Set(replacementChoice.options?.candidateInstanceIds ?? [])).toEqual(new Set([
      s.inst("spareKazemon").instanceId,
      s.inst("zephyrmon").instanceId,
    ]));
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: replacementChoice.decisionId,
      response: {
        kind: "selectCards",
        instanceIds: [s.inst("zephyrmon").instanceId],
      },
    })).toEqual({ ok: true });
    await deletion;
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        ({ topCard }) => topCard.instanceId === s.inst("zephyrmon").instanceId,
      ) && observe(s.engine).securityDp(0) === 0
    );

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT7-088", "BT7-035", "BT7-038", "BT7-042"]),
    );
    expect(s.state.players[0]!.hand.some(
      ({ instanceId }) => instanceId === s.inst("spareKazemon").instanceId,
    )).toBe(true);
    assertNoLoudGap(s);
  });
});
