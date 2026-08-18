import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-104.js";

describe("BT7-104 Black Memory Boost!", () => {
  it("identifies X-Antibody stacks by permanent and draws for the selected stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT7-056", as: "oneSource", under: ["BT7-057"] },
          { card: "BT7-056", as: "twoSources", under: ["BT7-057", "BT7-058"] },
        ],
        hand: [{ card: "BT7-104", as: "option" }],
        deck: ["BT7-001", "BT7-002", "BT7-003"],
      },
    });
    const handBefore = s.state.players[0]!.hand.length;
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("BT7-104");
    expect(new Set(decision.options?.candidateInstanceIds)).toEqual(new Set([
      s.perm("oneSource").permanentId,
      s.perm("twoSources").permanentId,
    ]));
    expect(decision.options?.candidateInstanceIds).not.toContain(
      s.perm("twoSources").topCard.instanceId,
    );
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: {
        kind: "chooseTargets",
        instanceIds: [s.perm("twoSources").permanentId],
      },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === handBefore + 1);

    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);
  });

  it("moves the checked security instance to its owner's hand before the trash sweep", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT7-104", as: "metalCannon" }] },
      1: { battleArea: [{ card: "AD1-001", dp: 5000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const securityInstanceId = s.inst("metalCannon").instanceId;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    expect(s.state.players[0]!.hand.some(
      ({ instanceId }) => instanceId === securityInstanceId,
    )).toBe(true);
    expect(s.state.players[0]!.trash.some(
      ({ instanceId }) => instanceId === securityInstanceId,
    )).toBe(false);
  });
});
