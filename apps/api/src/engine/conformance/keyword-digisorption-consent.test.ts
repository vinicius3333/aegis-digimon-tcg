import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/BT3/BT3-056.js";
import "../../cards/BT5/BT5-058.js";
import "../../cards/AD1/AD1-011.js";
import "../../cards/BT1/BT1-009.js";

const KB_SHA256 = "4222de312acf7f62161e0c6a2c2655f30fcef0259ca405ed88fb7e7e8ca10375";

function citeDigisorption() {
  cite("comprehensive-0228", "§16-10-1: suspend 1 of your Digimon to reduce the evolution cost by N", KB_SHA256);
}

describe("Digisorption public consent and payer identity", () => {
  beforeEach(citeDigisorption);

  it("accepts BT3-056 -3 and selects the exact payer among two public candidates", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-011", as: "base" },
            { card: "BT1-009", as: "payerA" },
            { card: "BT1-009", as: "payerB" },
          ],
          hand: [{ card: "BT3-056", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: false },
    );
    s.state.memory = 10;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const evolvingId = s.inst("evolving").instanceId;
    expect(s.perm("base").topCard.instanceId).toBe(baseId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([evolvingId]);
    expect(s.perm("payerA").isSuspended).toBe(false);
    expect(s.perm("payerB").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const consent = s.state.pendingDecision!;
    expect(consent.payloadJson).toContain("Digisorption");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: consent.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "selectCards" || s.state.pendingDecision?.kind === "chooseTargets",
    );
    const payerPrompt = s.state.pendingDecision!;
    const payerPayload = JSON.parse(payerPrompt.payloadJson ?? "{}");
    const payerId = s.perm("payerB").topCard.instanceId;
    expect(payerPayload.candidateInstanceIds).toContain(payerId);
    expect(payerPayload.candidateInstanceIds).toContain(s.perm("payerA").topCard.instanceId);
    expect(payerPayload.candidateInstanceIds).not.toContain(s.perm("opponent").topCard.instanceId);
    // The evolving hand instance is the public identity alias for the still-live base permanent.
    expect(payerPayload.candidateInstanceIds).toContain(evolvingId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: payerPrompt.decisionId,
        response:
          payerPrompt.kind === "selectCards"
            ? { kind: "selectCards", instanceIds: [payerId] }
            : { kind: "chooseTargets", instanceIds: [payerId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT3-056");
    expect(s.perm("payerA").isSuspended).toBe(false);
    expect(s.perm("payerB").isSuspended).toBe(true);
    expect(s.perm("base").topCard.instanceId).toBe(evolvingId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.memory).toBe(8);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("refuses BT3-056 -3 before payment and pays the full printed cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-011", as: "base" },
            { card: "BT1-009", as: "payer" },
          ],
          hand: [{ card: "BT3-056", as: "evolving" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const refusal = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: refusal.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT3-056");
    expect(s.perm("payer").isSuspended).toBe(false);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("evolving").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("accepts BT5-058 -2 through a public evolution and charges the reduced cost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-052", as: "base" },
            { card: "BT5-047", as: "payer" },
          ],
          hand: [{ card: "BT5-058", as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 4;
    await s.ready();
    preferred.push(s.perm("payer").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-058");
    expect(s.perm("payer").isSuspended).toBe(true);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("evolving").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
