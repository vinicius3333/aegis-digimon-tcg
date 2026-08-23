import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type BoardSpec } from "../../engine/testkit/harness.js";
import "./P-034.js";

describe("P-034 DemiDevimon", () => {
  function thresholdBoard(): BoardSpec {
    return {
      0: {
        battleArea: [{ card: "BT2-069", as: "host", under: ["P-034"] }],
        trash: [
          { card: "BT4-088", as: "danDevimon" },
          { card: "BT4-088", as: "otherDanDevimon" },
          "BT2-074",
          "BT3-088",
          "BT4-081",
          "BT4-084",
        ],
      },
    };
  }

  it("counts itself after deletion as the seventh Devimon and offers DanDevimon (Q4148)", async () => {
    const s = setupEngine(thresholdBoard());
    const danDevimonId = s.inst("danDevimon").instanceId;
    const otherDanDevimonId = s.inst("otherDanDevimon").instanceId;

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const optional = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("P-034");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const choice = s.state.pendingDecision!;
    const choiceRequest = s.decisions.at(-1)!.req;
    expect(choiceRequest.sourceCardId).toBe("P-034");
    expect(choiceRequest.options?.candidateInstanceIds).toEqual([danDevimonId, otherDanDevimonId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "selectCards", instanceIds: [danDevimonId] },
      }),
    ).toEqual({ ok: true });
    await deletion;
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === danDevimonId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === danDevimonId)).toBe(
      true,
    );
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "P-034")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("lets the player decline the single optional play", async () => {
    const s = setupEngine(thresholdBoard());
    const danDevimonId = s.inst("danDevimon").instanceId;

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await deletion;
    await settle(() => false, 80);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === danDevimonId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "P-034")).toHaveLength(1);
  });

  it("does not prompt when its deletion leaves only six Devimon cards in trash", async () => {
    const board = thresholdBoard();
    const seat = board[0]!;
    const s = setupEngine({
      0: {
        ...seat,
        trash: seat.trash!.slice(0, -1),
      },
    });
    const danDevimonId = s.inst("danDevimon").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => false, 80);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === danDevimonId)).toBe(true);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "P-034")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
