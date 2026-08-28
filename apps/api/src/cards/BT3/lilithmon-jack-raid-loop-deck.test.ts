import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-091.js";
import "../BT4/BT4-111.js";

describe("BT3 Lilithmon Jack Raid loop deck gauntlet", () => {
  it("returns two exact Option copies and grants memory only for the first use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "levelFiveBase" }],
          hand: [{ card: "BT3-091", as: "lilithmon" }],
          trash: [
            { card: "BT4-111", as: "firstJackRaid" },
            { card: "BT4-111", as: "secondJackRaid" },
            { card: "BT2-108", as: "thirdPurpleOption" },
            ...Array.from({ length: 7 }, () => "BT4-077"),
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    const firstJackRaidId = s.inst("firstJackRaid").instanceId;
    const secondJackRaidId = s.inst("secondJackRaid").instanceId;
    const thirdOptionId = s.inst("thirdPurpleOption").instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("levelFiveBase").permanentId,
        instanceId: s.inst("lilithmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const recursionDecision = s.state.pendingDecision;
    expect(recursionDecision?.kind).toBe("selectCards");
    const recursionRequest = s.decisions.find(({ req }) => req.decisionId === recursionDecision?.decisionId)?.req;
    expect(recursionRequest?.sourceCardId).toBe("BT3-091");
    expect(new Set(recursionRequest?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([firstJackRaidId, secondJackRaidId, thirdOptionId]),
    );
    expect(recursionRequest?.options?.max).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: recursionDecision!.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [secondJackRaidId, firstJackRaidId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === firstJackRaidId) &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === secondJackRaidId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash).toHaveLength(8);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: firstJackRaidId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === firstJackRaidId) && s.state.memory === 2,
    );
    expect(s.state.memory).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: secondJackRaidId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === secondJackRaidId));

    // Q1278: the second Jack Raid sees only 9 cards before it moves to trash, so it gains 0.
    // Lilithmon's trigger is also once per turn, leaving the first use's +2 unchanged.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash).toHaveLength(10);
    assertNoLoudGap(s);
  });
});
