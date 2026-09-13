import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

const KB_15_7_SHA256 = "255a54ddb16e8b3afbf5e0e984ade2a3525df85fae97c11e90af762d2932bc0b";
const KB_15_8_SHA256 = "50033be9509953fb2b00c56799e11cee1838740d4c5c06a962969a748a6fcdde";

describe("BT11-112 triggered-cost order pool", () => {
  beforeEach(() => {
    cite("comprehensive-0169", "§15-7 optional processing conditions", KB_15_7_SHA256);
    cite("comprehensive-0177", "§15-8-5 immediate-type effects trigger then may be activated", KB_15_8_SHA256);
  });

  it("orders two ready Rinas while excluding a spent Rina, then resolves both declines", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-112", as: "readyRina" },
            { card: "BT11-112", as: "secondRina" },
            { card: "BT11-112", as: "spentRina", suspended: true },
            { card: "BT22-023", as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: [{ card: "BT1-009", as: "security" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoOrderTriggers: false },
    );
    const securityId = s.inst("security").instanceId;
    const victimId = s.inst("victim").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const first = s.state.pendingDecision!;
    const firstPayload = JSON.parse(first.payloadJson ?? "{}");
    const firstKeys: string[] = firstPayload.triggerKeys;
    expect(firstPayload.triggerCardIds).toEqual(["BT11-112", "BT11-112"]);
    expect(firstKeys).toHaveLength(2);
    expect(firstKeys.some((key) => key.includes(s.inst("readyRina").instanceId))).toBe(true);
    expect(firstKeys.some((key) => key.includes(s.inst("secondRina").instanceId))).toBe(true);
    expect(firstKeys.some((key) => key.includes(s.inst("spentRina").instanceId))).toBe(false);
    const firstReadyKey = firstKeys.find((key) => key.includes(s.inst("readyRina").instanceId))!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: first.decisionId,
        response: { kind: "orderTriggers", order: [firstReadyKey] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const firstOptional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstOptional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.pendingDecision?.decisionId).not.toBe(firstOptional.decisionId);
    {
      const secondOptional = s.state.pendingDecision!;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: secondOptional.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.perm("readyRina").isSuspended).toBe(false);
    expect(s.perm("secondRina").isSuspended).toBe(false);
    expect(s.perm("spentRina").isSuspended).toBe(true);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([securityId]);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard.instanceId)).toEqual([victimId]);
    expect(s.perm("attacker").topCard.instanceId).toBe(s.inst("attacker").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
