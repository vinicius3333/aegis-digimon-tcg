import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-055.js";

describe("BT5-055 BanchoLillymon", () => {
  it("returns a suspended opposing Digimon to deck bottom and trashes its sources when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-055", as: "bancho" },
            { card: "BT2-047", as: "unrelated", under: [{ card: "BT1-009", as: "unrelatedSource" }] },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT4-073",
              as: "target",
              suspended: true,
              under: [
                { card: "BT1-009", as: "source" },
                { card: "BT1-010", as: "secondSource" },
              ],
            },
            { card: "BT2-047", as: "otherSuspended", suspended: true },
            { card: "BT2-047", as: "upright" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    const targetId = s.perm("target").topCard!.instanceId;
    const sourceId = s.inst("source").instanceId;
    const secondSourceId = s.inst("secondSource").instanceId;
    const unrelatedSourceId = s.inst("unrelatedSource").instanceId;
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("bancho").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options).toMatchObject({ min: 1, max: 1 });
    expect(request.options?.candidateInstanceIds).toEqual([
      s.perm("target").permanentId,
      s.perm("otherSuspended").permanentId,
    ]);
    expect(request.options?.candidateInstanceIds).not.toContain(s.perm("upright").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] },
      }),
    ).toEqual({ ok: true });
    await deletion;
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === targetId));

    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(targetId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === secondSourceId)).toBe(true);
    expect(s.state.players[1]!.deck.some((card) => [sourceId, secondSourceId].includes(card.instanceId))).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === unrelatedSourceId)).toBe(false);
    expect(s.perm("unrelated")).toBeDefined();
    expect(s.perm("upright")).toBeDefined();
  });

  it("does nothing when the opponent has no suspended Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-055", as: "bancho" },
          { card: "BT2-047", as: "unrelated", under: [{ card: "BT1-009", as: "unrelatedSource" }] },
        ],
      },
      1: {
        battleArea: [{ card: "BT4-073", as: "upright", under: [{ card: "BT1-010", as: "targetSource" }] }],
      },
    });
    const targetId = s.perm("upright").topCard!.instanceId;
    const targetSourceId = s.inst("targetSource").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("bancho").permanentId], "byEffect");
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT5-055"));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(true);
    expect(s.perm("upright").stack.some((card) => card.instanceId === targetSourceId)).toBe(true);
    expect(s.perm("unrelated")).toBeDefined();
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
