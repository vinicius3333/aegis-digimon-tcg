import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-066.js";
import "./BT10-092.js";
import "./BT10-104.js";

describe("BT10 DarkKnightmon / Nene / Immortal Ruler deck gauntlet", () => {
  it("selects exact trash materials, clears after De-Digivolve, gains Blocker, then splits its stack on deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-092", as: "nene" }],
          hand: [{ card: "BT10-104", as: "immortalRuler" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
          trash: [
            { card: "BT10-066", as: "darkKnightmon" },
            { card: "BT7-058", as: "chosenSkullKnightmon" },
            { card: "BT7-058", as: "unchosenSkullKnightmon" },
            { card: "BT7-059", as: "chosenDeadlyAxemon" },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT10-020",
              as: "deDigivolveDeleteTarget",
              under: [{ card: "BT1-009", as: "revealedRookie" }],
            },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: false,
        autoOrderCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    const deleteTargetId = s.perm("deDigivolveDeleteTarget").permanentId;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("immortalRuler").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const materialDecision = s.state.pendingDecision!;
    const materialRequest = s.decisions.find(({ req }) => req.decisionId === materialDecision.decisionId)!.req;
    const chosenMaterials = [s.inst("chosenSkullKnightmon").instanceId, s.inst("chosenDeadlyAxemon").instanceId];
    expect(materialRequest.options).toMatchObject({ min: 0, max: 2 });
    expect(materialRequest.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([...chosenMaterials, s.inst("unchosenSkullKnightmon").instanceId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: materialDecision.decisionId,
        response: { kind: "selectCards", instanceIds: chosenMaterials },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT10-066") &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === deleteTargetId) &&
        s.state.pendingDecision === undefined &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT10-104"),
      5000,
    );
    const darkKnightmon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT10-066")!;
    expect(new Set(darkKnightmon.stack.map(({ instanceId }) => instanceId))).toEqual(new Set(chosenMaterials));
    expect(
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("unchosenSkullKnightmon").instanceId),
    ).toBe(true);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("revealedRookie").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(6);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    await settle(() => observe(s.engine).hasKeyword(darkKnightmon, "Blocker"));
    expect(darkKnightmon.controllerSeat).toBe(0);
    expect(observe(s.engine).hasKeyword(darkKnightmon, "Blocker")).toBe(true);

    preferred.push(s.inst("chosenSkullKnightmon").instanceId, s.inst("chosenDeadlyAxemon").instanceId);
    // The optional deletion replacement opens a decision.  Start the verb before
    // resolving its mandatory play selection after the optional payment is accepted.
    const deletion = advance(s.engine).verb.deletePermanent([darkKnightmon.permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const splitDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: splitDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("chosenDeadlyAxemon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("chosenSkullKnightmon").instanceId) &&
        s.state.players[0]!.battleArea.some(
          ({ topCard }) => topCard.instanceId === s.inst("chosenDeadlyAxemon").instanceId,
        ) && s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("darkKnightmon").instanceId),
      5000,
    );
    expect(await deletion).toBe(1);

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("darkKnightmon").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });
});
