import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

const KB_SHA256 = "421968eeef0e4dbcf8f51d9accb3d3014093d48e6dd988f5ff838d1442eba9ca";

describe("borrowed effect processing cost", () => {
  beforeEach(() => {
    cite("comprehensive-0169", "§15-7-1/2: processing cost gates the payload and refusal skips it", KB_SHA256);
  });

  it("lets the player decline BT23-045's borrowed optional placement cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-060", as: "machine" }],
          security: [{ card: "BT23-045", faceUp: true }],
          trash: [{ card: "BT23-043", as: "payer" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: ["BT1-028"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
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
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === payerId)).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT23-045"]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]?.topCard.instanceId).toBe(victimInstanceId);
    expect(s.perm("machine").topCard.instanceId).toBe(s.inst("machine").instanceId);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("lets the player decline the borrowed cost from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-060", as: "machine" }],
          security: [{ card: "BT23-045", faceUp: true }],
          hand: [{ card: "BT23-015", as: "payer" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: ["BT1-028"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
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
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === payerId)).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT23-045"]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]?.topCard.instanceId).toBe(victimInstanceId);
    expect(s.perm("machine").topCard.instanceId).toBe(s.inst("machine").instanceId);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
