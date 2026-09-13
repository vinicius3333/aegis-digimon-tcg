import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

const KB_SHA256 = "255a54ddb16e8b3afbf5e0e984ade2a3525df85fae97c11e90af762d2932bc0b";

describe("borrowed effect processing cost", () => {
  beforeEach(() => {
    cite("comprehensive-0169", "§15-7-1/2: processing cost gates the payload and refusal skips it", KB_SHA256);
  });

  it("forces BT23-045's payable borrowed placement cost before its return payload", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-060", as: "machine" }],
          security: [{ card: "BT23-045", faceUp: true }],
          trash: [{ card: "BT23-043", as: "payer" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: ["BT1-028"] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const payerId = s.inst("payer").instanceId;
    const victimInstanceId = s.inst("victim").instanceId;
    await s.ready();
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === payerId)).toBe(false);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT23-045", "BT23-043"]);
    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(payerId);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(victimInstanceId);
    expect(s.perm("machine").topCard.instanceId).toBe(s.inst("machine").instanceId);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("forces the borrowed cost from hand without opening a second consent prompt", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-060", as: "machine" }],
          security: [{ card: "BT23-045", faceUp: true }],
          hand: [{ card: "BT23-015", as: "payer" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: ["BT1-028"] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const payerId = s.inst("payer").instanceId;
    const victimInstanceId = s.inst("victim").instanceId;
    await s.ready();
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === payerId)).toBe(false);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT23-045", "BT23-015"]);
    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(payerId);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(victimInstanceId);
    expect(s.perm("machine").topCard.instanceId).toBe(s.inst("machine").instanceId);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
