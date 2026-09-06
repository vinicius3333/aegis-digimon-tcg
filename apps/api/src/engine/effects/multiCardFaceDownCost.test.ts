import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "./collect.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../../cards/index.js";

describe("multi-card bottom face-down Tamer costs", () => {
  it("pays two cards from one Tamer, then uses the paid Option from trash", async () => {
    const automation = { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: false };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-070", as: "nightchirop" },
            {
              card: "BT1-085",
              as: "firstTamer",
              under: [
                { card: "BT1-001", as: "faceUp", faceUp: true },
                { card: "BT1-002", as: "paidOne", faceUp: false },
                { card: "P-236", as: "optionCost", faceUp: false },
              ],
            },
            { card: "BT1-085", as: "secondTamer", under: [{ card: "BT1-003", as: "otherCost", faceUp: false }] },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      automation,
    );
    const optionId = s.inst("optionCost").instanceId;
    s.state.memory = 2;
    await s.ready();
    const source = observe(s.engine).cardSource(s.inst("nightchirop"));
    const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
      entry.effectKey.startsWith("BT26-070/"),
    );
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("nightchirop").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const firstDecision = s.state.pendingDecision!;
    const firstPayload = JSON.parse(firstDecision.payloadJson) as { candidateInstanceIds?: string[] };
    expect(firstPayload.candidateInstanceIds).toEqual([s.inst("paidOne").instanceId, s.inst("otherCost").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("paidOne").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const secondDecision = s.state.pendingDecision!;
    const secondPayload = JSON.parse(secondDecision.payloadJson) as { candidateInstanceIds?: string[] };
    expect(secondPayload.candidateInstanceIds).toEqual([
      s.inst("optionCost").instanceId,
      s.inst("otherCost").instanceId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("optionCost").instanceId] },
      }),
    ).toEqual({ ok: true });
    automation.autoSelectCards = true;
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("paidOne").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("optionCost").instanceId);
    expect(s.perm("firstTamer").stack.map((card) => card.instanceId)).toEqual([s.inst("faceUp").instanceId]);
    expect(s.perm("secondTamer").stack.map((card) => card.instanceId)).toEqual([s.inst("otherCost").instanceId]);
  });

  it("rejects a one-card Tamer cost without mutating the face-down card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-070", as: "nightchirop" },
            { card: "BT1-085", as: "tamer", under: [{ card: "BT1-001", as: "onlyCard", faceUp: false }] },
          ],
          trash: [{ card: "P-236", as: "optionInTrash" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const source = observe(s.engine).cardSource(s.inst("nightchirop"));
    const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
      entry.effectKey.startsWith("BT26-070/"),
    );
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("nightchirop").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("onlyCard").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("optionInTrash").instanceId]);
    expect(s.state.memory).toBe(2);
  });
});
